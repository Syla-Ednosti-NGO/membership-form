/* ================================
   PDF template — builds two A4 pages:
   Page 1: Заява
   Page 2: Анкета
   ================================ */

// ⚠️ Робоча назва організації. Замінити на актуальну, коли буде обрана.
const ORG_NAME = 'КИЇВТИЛ';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function todayStr() {
  const t = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${p(t.getDate())}.${p(t.getMonth() + 1)}.${t.getFullYear()}`;
}

function fullName(d) {
  return [d.lastName, d.firstName, d.middleName].filter(Boolean).join(' ');
}

function shortName(d) {
  const init = s => s ? s[0].toUpperCase() + '.' : '';
  return `${d.lastName || ''} ${init(d.firstName)}${init(d.middleName)}`.trim();
}

function sigImgHtml(sig) {
  if (!sig) return '<span class="pdf-sig-empty"></span>';
  return `<img src="${sig}" class="pdf-signature-img" alt="">`;
}

/* --------- PAGE 1 — Заява --------- */
function renderZayava(d) {
  const fio = fullName(d) || '_______________________________________';
  const sig = sigImgHtml(d.signatureData);
  return `
    <div class="pdf-head">
      <div class="pdf-head-left">
        <div class="pdf-head-org">Громадська організація<br>«${ORG_NAME}»</div>
        <div class="pdf-head-meta">
          Голові ГО «${ORG_NAME}»<br>
          від ${esc(fio)}
        </div>
      </div>
      <div class="pdf-head-right">
        ${todayStr()}&nbsp;р.
      </div>
    </div>

    <div class="pdf-title">
      <h1>ЗАЯВА</h1>
      <p>на вступ до Громадської організації «${ORG_NAME}»</p>
    </div>

    <div class="pdf-body">
      <p class="pdf-indent">
        Я, <strong>${esc(fio)}</strong>, прошу прийняти мене
        в члени Громадської організації «${ORG_NAME}».
      </p>
      <p class="pdf-indent">
        Зі змістом Статуту організації ознайомлений(на) і зобов'язуюсь їх виконувати.
      </p>
      <p class="pdf-indent">
        Підтверджую, що вся надана мною інформація у додатку до цієї заяви
        є достовірною.
      </p>
      <p class="pdf-indent">
        Надаю згоду Громадській організації «${ORG_NAME}» після прийому мене
        в члени організації на використання даної інформації відповідно
        до мети та завдань, викладених у Статуті.
      </p>

      <div class="pdf-attach">
        <div class="pdf-attach-title">Додаток:</div>
        <ol class="pdf-attach-list">
          <li>Анкета члена громадської організації</li>
          <li>Копія РНОКПП (ІПН) / скрін з Дії</li>
          <li>Копія паспорту / скрін з Дії</li>
        </ol>
      </div>
    </div>

    <div class="pdf-sig-row">
      <div class="pdf-sig-cell">
        <div class="pdf-sig-value">${todayStr()}</div>
        <div class="pdf-sig-label">(дата)</div>
      </div>
      <div class="pdf-sig-cell">
        <div class="pdf-sig-value pdf-sig-value--img">${sig}</div>
        <div class="pdf-sig-label">(особистий підпис)</div>
      </div>
      <div class="pdf-sig-cell">
        <div class="pdf-sig-value">${esc(fio)}</div>
        <div class="pdf-sig-label">(П.І.Б.)</div>
      </div>
    </div>
  `;
}

/* --------- PAGE 2 — Анкета --------- */
function renderAnketa(d) {
  const fio = fullName(d) || '—';
  const sig = sigImgHtml(d.signatureData);

  const otherMembership = d.otherMembership === 'yes'
    ? (d.otherMembershipName || 'Так')
    : 'Ні';

  const contactPref = (d.contactPref || []).length
    ? d.contactPref.join(', ')
    : '—';

  const row = (label, value) => `
    <tr>
      <th>${label}</th>
      <td>${esc(value || '—')}</td>
    </tr>
  `;

  const block = (label, value) => `
    <div class="pdf-q">
      <div class="pdf-q-label">${label}</div>
      <div class="pdf-q-value">${esc(value || '—')}</div>
    </div>
  `;

  return `
    <div class="pdf-title pdf-title--compact">
      <h1>АНКЕТА</h1>
      <p>члена Громадської організації «${ORG_NAME}»</p>
    </div>

    <table class="pdf-data-table">
      ${row('Прізвище, ім\'я, по батькові', fio)}
      ${row('РНОКПП (ІПН)', d.ipn)}
      ${row('Паспорт / ID-картка', d.passport)}
      ${row('Дата народження', formatDate(d.birthDate))}
      ${row('Освіта', d.education)}
      ${row('Місце роботи / проходження служби', d.occupation)}
      ${row('Контактний телефон', d.phone)}
      ${row('Електронна пошта', d.email)}
    </table>

    ${block('Чи є Ви членом інших громадських організацій? Якщо так, то яких?', otherMembership)}
    ${block('Як Вам зручніше отримувати повідомлення від організації?', contactPref)}
    ${block('Мета вступу до Організації:', d.purpose)}
    ${block('Ідеї та проекти:', d.ideas)}
    ${block('Інша інформація:', d.otherInfo)}

    <div class="pdf-sig-row pdf-sig-row--anketa">
      <div class="pdf-sig-cell">
        <div class="pdf-sig-value">${todayStr()}</div>
        <div class="pdf-sig-label">(дата)</div>
      </div>
      <div class="pdf-sig-cell">
        <div class="pdf-sig-value pdf-sig-value--img">${sig}</div>
        <div class="pdf-sig-label">(особистий підпис)</div>
      </div>
      <div class="pdf-sig-cell">
        <div class="pdf-sig-value">${esc(fio)}</div>
        <div class="pdf-sig-label">(П.І.Б.)</div>
      </div>
    </div>
  `;
}

window.PDF_TEMPLATE = { renderZayava, renderAnketa, ORG_NAME, fullName, shortName };
