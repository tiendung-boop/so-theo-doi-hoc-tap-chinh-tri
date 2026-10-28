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

  App.views = {};
})(window.App);
