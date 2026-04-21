/* ================================
   Membership Form — wizard logic
   ================================ */

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

const STATE = {
  lastName: '', firstName: '', middleName: '',
  birthDate: '',
  ipn: '',
  passport: '',
  phone: '', email: '',
  contactPref: [],
  education: '',
  occupation: '',
  otherMembership: 'no',
  otherMembershipName: '',
  purpose: '',
  ideas: '',
  otherInfo: '',
  signatureData: '',
  signatureSource: '',
};

/* ========= TOAST ========= */
const toastEl = $('#toast');
function toast(msg, opts = {}) {
  toastEl.textContent = msg;
  toastEl.classList.toggle('error', !!opts.error);
  toastEl.classList.add('visible');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('visible'), opts.ms || 2400);
}

/* ========= BIND SIMPLE INPUTS ========= */
const TEXT_FIELDS = [
  'lastName', 'firstName', 'middleName',
  'birthDate', 'ipn', 'passport',
  'phone', 'email',
  'education', 'occupation',
  'otherMembershipName',
  'purpose', 'ideas', 'otherInfo',
];
TEXT_FIELDS.forEach(id => {
  const el = $('#' + id);
  if (!el) return;
  el.addEventListener('input', e => { STATE[id] = e.target.value; clearError(id); });
});

/* ========= IPN digits-only ========= */
$('#ipn').addEventListener('input', e => {
  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
  if (cleaned !== e.target.value) e.target.value = cleaned;
  STATE.ipn = cleaned;
});

/* ========= PHONE MASK ========= */
new Cleave('#phone', {
  prefix: '+38',
  blocks: [3, 3, 3, 2, 2],
  delimiters: [' (', ') ', '-', '-'],
  numericOnly: true,
});

/* ========= DEFAULT DATES ========= */
(function setDefaultDates() {
  const today = new Date().toISOString().slice(0, 10);
  // no application date field anymore — signature date uses today automatically
})();

/* ========= RADIO: otherMembership ========= */
$$('input[name="otherMembership"]').forEach(r => {
  r.addEventListener('change', e => {
    STATE.otherMembership = e.target.value;
    $('#otherMembershipDetails').classList.toggle('hidden', e.target.value !== 'yes');
    if (e.target.value !== 'yes') {
      STATE.otherMembershipName = '';
      $('#otherMembershipName').value = '';
    }
  });
});

/* ========= CHECKBOX: contactPref ========= */
$$('input[name="contactPref"]').forEach(cb => {
  cb.addEventListener('change', () => {
    STATE.contactPref = $$('input[name="contactPref"]:checked').map(c => c.value);
  });
});

/* ========= CHAR COUNTERS ========= */
function bindCounter(inputId, counterId, limit) {
  const input = $('#' + inputId);
  const counter = $('#' + counterId);
  if (!input || !counter) return;
  const update = () => {
    const len = input.value.length;
    counter.textContent = `${len} / ${limit}`;
    counter.classList.toggle('warn', len >= Math.floor(limit * 0.9));
  };
  input.addEventListener('input', update);
  update();
}
bindCounter('purpose', 'purpose-counter', 400);
bindCounter('ideas', 'ideas-counter', 400);
bindCounter('otherInfo', 'otherInfo-counter', 400);

/* ========= VALIDATION ========= */
function setError(id, msg) {
  const el = $(`[data-error-for="${id}"]`);
  if (el) el.textContent = msg || '';
  const input = $('#' + id);
  if (input) input.classList.toggle('invalid', !!msg);
}
function clearError(id) { setError(id, ''); }
function clearAllErrors() {
  $$('.field-error').forEach(e => e.textContent = '');
  $$('.big-input.invalid, .big-textarea.invalid').forEach(e => e.classList.remove('invalid'));
}

function validateStep(step) {
  clearAllErrors();
  let ok = true;
  const req = (id, msg) => {
    const v = (STATE[id] || '').trim();
    if (!v) { setError(id, msg || 'Обов\'язкове поле'); ok = false; }
  };

  if (step === 1) {
    req('lastName');
    req('firstName');
    req('middleName');
    req('birthDate', 'Вкажіть дату народження');
    if (STATE.ipn && !/^\d{10}$/.test(STATE.ipn)) {
      setError('ipn', 'Має бути рівно 10 цифр'); ok = false;
    } else if (!STATE.ipn) {
      setError('ipn', 'Обов\'язкове поле'); ok = false;
    }
    req('passport');
  }
  if (step === 2) {
    if (!STATE.phone || STATE.phone.replace(/\D/g, '').length < 12) {
      setError('phone', 'Вкажіть телефон повністю'); ok = false;
    }
    if (!STATE.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(STATE.email)) {
      setError('email', 'Некоректний email'); ok = false;
    }
  }
  if (step === 3) {
    req('purpose', 'Вкажіть мету вступу');
  }
  if (step === 4) {
    if (!collectSignature()) {
      setError('signature', 'Поставте підпис або завантажте фото');
      ok = false;
    }
  }
  return ok;
}

/* ========= STEP NAVIGATION ========= */
const pages = $$('.page');
const dots = $$('.step-dot');
let currentStep = 1;
const MAX_STEP = 5;

function goTo(step, { skipValidation = false } = {}) {
  step = Math.max(1, Math.min(MAX_STEP, step));
  if (!skipValidation && step > currentStep) {
    for (let s = currentStep; s < step; s++) {
      if (!validateStep(s)) {
        toast('Заповніть обов\'язкові поля', { error: true });
        return;
      }
    }
  }
  currentStep = step;
  pages.forEach(p => p.classList.toggle('active', +p.dataset.step === step));
  dots.forEach(d => {
    const s = +d.dataset.step;
    d.classList.toggle('active', s === step);
    d.classList.toggle('done', s < step);
  });
  if (step === 4) prepareSignatureArea();
  if (step === 5) renderReview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$$('.btn-next').forEach(b => b.addEventListener('click', () => goTo(+b.dataset.target)));
$$('.btn-back').forEach(b => b.addEventListener('click', () => goTo(+b.dataset.target, { skipValidation: true })));
dots.forEach(d => {
  d.addEventListener('click', () => {
    const target = +d.dataset.step;
    if (target <= currentStep) goTo(target, { skipValidation: true });
    else goTo(target);
  });
});

/* ========= SIGNATURE PAD ========= */
const canvas = $('#signatureCanvas');
const canvasWrap = canvas.parentElement;
let signaturePad = null;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const data = signaturePad && !signaturePad.isEmpty() ? signaturePad.toData() : null;
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(ratio, ratio);
  if (signaturePad) {
    signaturePad.clear();
    if (data) signaturePad.fromData(data);
  }
}

function initSignaturePad() {
  if (signaturePad) return;
  resizeCanvas();
  signaturePad = new SignaturePad(canvas, {
    backgroundColor: 'rgba(255,255,255,0)',
    penColor: '#0F1A2E',
    minWidth: 0.8,
    maxWidth: 2.2,
  });
  signaturePad.addEventListener('beginStroke', () => canvasWrap.classList.add('has-content'));
  signaturePad.addEventListener('endStroke', () => {
    if (signaturePad.isEmpty()) canvasWrap.classList.remove('has-content');
    STATE.signatureSource = 'draw';
    clearError('signature');
  });
}

function prepareSignatureArea() {
  initSignaturePad();
  requestAnimationFrame(() => {
    resizeCanvas();
    requestAnimationFrame(resizeCanvas);
  });
}

$('#btn-clear-sig').addEventListener('click', () => {
  if (signaturePad) {
    signaturePad.clear();
    canvasWrap.classList.remove('has-content');
  }
});

window.addEventListener('resize', () => {
  if ($('.sig-panel[data-sig-panel="draw"]').classList.contains('active')) resizeCanvas();
});

/* ========= SIGNATURE TABS ========= */
$$('.sig-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.sigTab;
    $$('.sig-tab').forEach(t => t.classList.toggle('active', t === tab));
    $$('.sig-panel').forEach(p => p.classList.toggle('active', p.dataset.sigPanel === target));
    if (target === 'draw') prepareSignatureArea();
  });
});

/* ========= PHOTO UPLOAD ========= */
const sigPhotoInput = $('#sigPhoto');
const sigPreview = $('#sigPreview');
const sigPreviewWrap = $('#sigPreviewWrap');
const sigUploadBtn = $('.sig-upload-btn');

sigPhotoInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    sigPreview.src = ev.target.result;
    sigPreviewWrap.classList.remove('hidden');
    sigUploadBtn.classList.add('hidden');
    STATE.signatureSource = 'photo';
    STATE.signatureData = ev.target.result;
    clearError('signature');
  };
  reader.readAsDataURL(file);
});

$('#btn-clear-photo').addEventListener('click', () => {
  sigPhotoInput.value = '';
  sigPreview.src = '';
  sigPreviewWrap.classList.add('hidden');
  sigUploadBtn.classList.remove('hidden');
  if (STATE.signatureSource === 'photo') {
    STATE.signatureData = '';
    STATE.signatureSource = '';
  }
});

/* ========= COLLECT SIGNATURE ========= */
function collectSignature() {
  const activePanel = $('.sig-panel.active').dataset.sigPanel;
  if (activePanel === 'draw') {
    if (!signaturePad || signaturePad.isEmpty()) return '';
    STATE.signatureSource = 'draw';
    STATE.signatureData = signaturePad.toDataURL('image/png');
    return STATE.signatureData;
  } else {
    return STATE.signatureSource === 'photo' ? STATE.signatureData : '';
  }
}

/* ========= REVIEW ========= */
function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function renderReview() {
  collectSignature();
  const fio = [STATE.lastName, STATE.firstName, STATE.middleName].filter(Boolean).join(' ');
  const contactPrefStr = STATE.contactPref.length ? STATE.contactPref.join(', ') : '—';
  const otherMemb = STATE.otherMembership === 'yes'
    ? (STATE.otherMembershipName || 'Так')
    : 'Ні';

  const section = (title, step, rows, extra = '') => `
    <div class="review-section">
      <div class="review-section-head">
        <div class="review-section-title">${title}</div>
        <button type="button" class="review-edit" data-edit-step="${step}">Змінити</button>
      </div>
      <div class="review-body">
        ${rows.map(([k, v]) => `
          <div class="review-row">
            <div class="review-key">${k}</div>
            <div class="review-val ${v ? '' : 'empty'}">${v ? escapeHtml(v) : '—'}</div>
          </div>
        `).join('')}
        ${extra}
      </div>
    </div>
  `;

  const sigExtra = STATE.signatureData
    ? `<div class="review-row">
         <div class="review-key">Підпис</div>
         <div class="review-val"><img src="${STATE.signatureData}" class="review-sig-img" alt="підпис"></div>
       </div>`
    : `<div class="review-row">
         <div class="review-key">Підпис</div>
         <div class="review-val empty">—</div>
       </div>`;

  $('#review').innerHTML =
    section('Особисті дані', 1, [
      ['ПІБ', fio],
      ['Дата народження', fmtDate(STATE.birthDate)],
      ['РНОКПП (ІПН)', STATE.ipn],
      ['Паспорт / ID', STATE.passport],
    ]) +
    section('Контакти', 2, [
      ['Телефон', STATE.phone],
      ['Email', STATE.email],
      ['Спосіб комунікації', contactPrefStr],
    ]) +
    section('Анкета', 3, [
      ['Освіта', STATE.education],
      ['Місце роботи / служби', STATE.occupation],
      ['Член інших ГО', otherMemb],
      ['Мета вступу', STATE.purpose],
      ['Ідеї та проекти', STATE.ideas],
      ['Інша інформація', STATE.otherInfo],
    ]) +
    section('Підпис', 4, [], sigExtra);

  $$('.review-edit').forEach(b => {
    b.addEventListener('click', () => goTo(+b.dataset.editStep, { skipValidation: true }));
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

/* ========= PDF GENERATION ========= */
const btnPdf = $('#btn-pdf');

btnPdf.addEventListener('click', async () => {
  const originalText = btnPdf.textContent;
  btnPdf.disabled = true;
  btnPdf.textContent = 'Готуємо PDF…';

  try {
    collectSignature();
    const data = { ...STATE };

    $('#pdfPage1').innerHTML = window.PDF_TEMPLATE.renderZayava(data);
    $('#pdfPage2').innerHTML = window.PDF_TEMPLATE.renderAnketa(data);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ format: 'a4', unit: 'mm', orientation: 'portrait' });

    const page1 = $('#pdfPage1');
    const page2 = $('#pdfPage2');

    // Force html2canvas to render at the actual element size (794×1123 ≈ A4 @ 96dpi),
    // ignoring the mobile viewport. Without windowWidth/windowHeight, mobile browsers
    // render the capture at the viewport width (~375px) and the resulting image is
    // stretched across A4 in the PDF, making text look ~2× too large.
    const PX_W = 794;
    const PX_H = 1123;

    const renderOpts = (el) => ({
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: PX_W,
      height: Math.max(PX_H, el.scrollHeight),
      windowWidth: PX_W,
      windowHeight: Math.max(PX_H, el.scrollHeight),
    });

    const canvas1 = await html2canvas(page1, renderOpts(page1));
    doc.addImage(canvas1.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);

    doc.addPage();
    const canvas2 = await html2canvas(page2, renderOpts(page2));
    doc.addImage(canvas2.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);

    const filename = `Заява_${STATE.lastName || 'вступ'}.pdf`;
    doc.save(filename);
    toast('✓ PDF завантажено');
  } catch (e) {
    console.error(e);
    toast('Помилка: ' + e.message, { error: true });
  } finally {
    btnPdf.disabled = false;
    btnPdf.textContent = originalText;
  }
});

/* ========= NEW FORM ========= */
$('#btn-new').addEventListener('click', () => {
  if (!confirm('Почати нову заяву? Всі введені дані зникнуть.')) return;
  location.reload();
});

/* ========= INIT =========
   Signature pad is initialised lazily when the user reaches step 4
   (see prepareSignatureArea in goTo). Initialising earlier gives the
   canvas a zero size because step 4 is display:none on load, which
   causes cursor offset vs. drawn stroke. */
