/**
 * Cloudflare Worker — forwards membership-form submissions to Resend.
 *
 * Accepts a multipart/form-data POST with:
 *   - fio, email, phone, note  (text fields)
 *   - pdf                      (the generated PDF, single file)
 *   - file                     (zero or more extra files)
 *
 * Requires environment bindings:
 *   - RESEND_API_KEY   (secret)
 *   - TO_EMAIL         (vars)  recipient
 *   - FROM_EMAIL       (vars)  sender, e.g. "onboarding@resend.dev"
 *   - ALLOWED_ORIGINS  (vars)  comma-separated origins allowed to call this worker
 */

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const corsOrigin = allowed.includes(origin) ? origin : (allowed[0] || '*');

    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method Not Allowed' }, 405, corsHeaders);
    }

    try {
      const form = await request.formData();
      const fio   = str(form.get('fio'));
      const email = str(form.get('email'));
      const phone = str(form.get('phone'));
      const note  = str(form.get('note'));
      const pdf   = form.get('pdf');
      const extra = form.getAll('file').filter(f => f instanceof File && f.size > 0);

      const attachments = [];

      if (pdf instanceof File && pdf.size > 0) {
        attachments.push({
          filename: pdf.name || 'zayava.pdf',
          content: await toBase64(pdf),
        });
      }
      for (const f of extra) {
        attachments.push({
          filename: f.name,
          content: await toBase64(f),
        });
      }

      // 40MB Resend limit — fail fast with a clear message
      const totalMB = attachments.reduce((s, a) => s + a.content.length * 0.75, 0) / (1024 * 1024);
      if (totalMB > 38) {
        return json({ error: `Вкладення надто великі: ${totalMB.toFixed(1)} MB (ліміт 40 MB)` }, 413, corsHeaders);
      }

      const subject = `Заява на вступ — ${fio || 'без імені'}`;
      const html = buildHtml({ fio, email, phone, note, attachments });

      const resendResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.FROM_EMAIL || 'onboarding@resend.dev',
          to: [env.TO_EMAIL],
          subject,
          html,
          reply_to: email || undefined,
          attachments,
        }),
      });

      const body = await resendResp.json();
      if (!resendResp.ok) {
        return json({ error: body.message || 'Resend error', details: body }, 502, corsHeaders);
      }
      return json({ ok: true, id: body.id }, 200, corsHeaders);
    } catch (e) {
      return json({ error: e.message || String(e) }, 500, corsHeaders);
    }
  },
};

/* ---------- helpers ---------- */

function str(v) { return (v == null ? '' : String(v)).trim(); }

function json(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

async function toBase64(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode.apply(null, buf.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function buildHtml({ fio, email, phone, note, attachments }) {
  const row = (k, v) => v
    ? `<tr><td style="padding:6px 10px;color:#6E7380;">${esc(k)}</td><td style="padding:6px 10px;color:#0F1A2E;">${esc(v)}</td></tr>`
    : '';
  const files = attachments.map(a => `<li>${esc(a.filename)}</li>`).join('');
  return `
  <div style="font-family:Arial,sans-serif;font-size:14px;color:#0F1A2E;max-width:600px;">
    <h2 style="color:#1A2B4A;margin:0 0 12px;">Нова заява на вступ</h2>
    <table style="border-collapse:collapse;margin-bottom:16px;">
      ${row('ПІБ', fio)}
      ${row('Email', email)}
      ${row('Телефон', phone)}
    </table>
    ${note ? `<p style="white-space:pre-wrap;"><strong>Коментар:</strong><br>${esc(note)}</p>` : ''}
    <p><strong>Вкладення (${attachments.length}):</strong></p>
    <ul>${files}</ul>
    <hr style="border:none;border-top:1px solid #DDE2EA;margin:16px 0;">
    <p style="color:#6E7380;font-size:12px;">Надіслано з форми membership-form.</p>
  </div>`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>');
}
