'use strict';
// Không dùng ES module: Chrome/Edge chặn <script type="module"> khi mở file trực tiếp (file://),
// nên mọi file dùng chung namespace window.App và được nạp theo thứ tự trong index.html.
window.App = window.App || {};

(function (App) {
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  App.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);

  App.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  App.$ = (sel, root) => (root || document).querySelector(sel);
  App.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  App.pad2 = (n) => String(n).padStart(2, '0');

  // Ngày lưu dạng 'YYYY-MM-DD' (chuỗi), không dùng Date để tránh lệch múi giờ.
  App.todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${App.pad2(d.getMonth() + 1)}-${App.pad2(d.getDate())}`;
  };
  App.fmtDate = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };
  App.fmtDateShort = (iso) => {
    if (!iso) return '';
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  };
  App.yearOf = (iso) => (iso ? Number(iso.slice(0, 4)) : null);
  App.monthOf = (iso) => (iso ? Number(iso.slice(5, 7)) : null);

  // Số kiểu Việt Nam: dấu phẩy thập phân.
  App.fmtNum = (n, digits) => {
    if (n == null || Number.isNaN(n)) return '';
    let s = Number(n).toFixed(digits == null ? 2 : digits);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s.replace('.', ',');
  };
  App.parseNum = (s) => {
    if (s == null) return null;
    const t = String(s).trim().replace(',', '.');
    if (t === '') return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
  };
  App.pct = (a, b) => (b ? (a / b) * 100 : null);
  App.fmtPct = (p) => (p == null ? '–' : p.toFixed(1).replace('.', ',') + '%');

  // Bỏ dấu tiếng Việt để tìm kiếm và so khớp tên đơn vị khi nhập Excel.
  App.norm = (s) =>
    String(s == null ? '' : s)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  App.collator = new Intl.Collator('vi', { sensitivity: 'base', numeric: true });

  App.chunk = (arr, n) => {
    const out = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  };

  App.debounce = (fn, ms) => {
    let t = null;
    const d = (...args) => {
      clearTimeout(t);
      t = setTimeout(() => {
        t = null;
        fn(...args);
      }, ms);
    };
    d.flush = () => {
      if (t) {
        clearTimeout(t);
        t = null;
        fn();
      }
    };
    return d;
  };

  // Bộ biểu tượng nét (24x24), vẽ bằng currentColor để ăn theo màu chữ.
  const ICONS = {
    home: '<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4"/><path d="M18.5 14.5a6.5 6.5 0 0 1 3 5.5"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9.2 15 2 2 3.8-3.8"/>',
    chart: '<path d="M3.5 20.5h17"/><path d="M6.5 17v-5M12 17V7M17.5 17v-8"/>',
    printer: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>',
    sliders: '<path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1"/><circle cx="15" cy="6.5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17.5" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    download: '<path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M4.5 19.5h15"/>',
    upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4.5 19.5h15"/>',
    check: '<path d="m5.5 12.5 4 4L18.5 7.5"/>',
    x: '<path d="M7 7l10 10M17 7 7 17"/>',
    back: '<path d="M14.5 18 8.5 12l6-6"/>',
    alert: '<path d="M12 9v4.5M12 17h.01"/><path d="M10.3 4 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    star: '<path fill="currentColor" stroke="none" d="M12 2.6l2.75 5.6 6.15.9-4.45 4.33 1.05 6.12L12 16.66l-5.5 2.89 1.05-6.12L3.1 9.1l6.15-.9z"/>',
  };
  App.icon = (name, cls) =>
    `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

  App.views = {};
})(window.App);
