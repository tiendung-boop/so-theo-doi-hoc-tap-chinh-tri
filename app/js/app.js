'use strict';
// Khởi động, điều hướng theo #hash và thanh bên (bìa sổ).
(function (App) {
  const { esc } = App;
  const S = App.store;

  App.viewState = {};

  const ROUTES = {
    '': 'tong-quan',
    so: 'so',
    in: 'in',
    'quan-nhan': 'quan-nhan',
    'hoc-bu': 'hoc-bu',
    'bao-cao': 'bao-cao',
    'cai-dat': 'cai-dat',
  };

  App.go = (hash) => {
    if (location.hash === hash) App.render();
    else location.hash = hash;
  };

  const parts = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);

  App.renderNav = () => {
    const p = parts();
    const here = p[0] || '';
    const m = S.state.meta;
    const chuaBu = App.M.countChuaHocBu();
    const link = (href, label, active, extra) =>
      `<a href="${href}"${active ? ' aria-current="page"' : ''}>${label}${extra || ''}</a>`;
    document.getElementById('bia').innerHTML = `
      <div class="bia-khung">
        <div class="bia-dv">${esc(m.trungDoan.toLocaleUpperCase('vi'))}<br><span class="gach-chan">${esc(m.tieuDoan.toLocaleUpperCase('vi'))}</span></div>
        <div class="bia-so">SỔ</div>
        <div class="bia-ten">Đăng ký theo dõi kết quả học tập chính trị</div>
        <nav class="bia-nav" aria-label="Chức năng">
          ${link('#/', 'Tổng quan', here === '')}
          <div class="nhom-nav" role="group" aria-label="Sổ theo dõi">
            ${App.DT.map((d) => link(`#/so/${d.ma}`, esc(d.ten), here === 'so' && p[1] === d.ma)).join('')}
          </div>
          ${link('#/quan-nhan', 'Danh sách quân nhân', here === 'quan-nhan')}
          ${link('#/hoc-bu', 'Học bù, học vét', here === 'hoc-bu', chuaBu ? ` <span class="huy-hieu" title="Lượt vắng chưa học bù">${chuaBu}</span>` : '')}
          ${link('#/bao-cao', 'Báo cáo', here === 'bao-cao')}
          ${link(`#/in/${here === 'so' && p[1] ? p[1] : 'BS1'}`, 'In sổ', here === 'in')}
          ${link('#/cai-dat', 'Cài đặt, sao lưu', here === 'cai-dat')}
        </nav>
        <div class="bia-nam">NĂM ${m.nam}</div>
      </div>`;
  };

  // Thanh nhắc việc ở đầu trang: quyền ghi file tự động lưu, hoặc lâu chưa sao lưu.
  function notice() {
    const div = document.createElement('div');
    div.className = 'thong-bao-chung khong-in';
    const days = S.state.lastBackup ? Math.floor((Date.now() - new Date(S.state.lastBackup)) / 86400000) : null;
    let html = '';
    if (S.lastError) {
      html = `<div class="bao loi">Không đọc được dữ liệu đã lưu trong trình duyệt (${esc(S.lastError.message)}). Đang dùng dữ liệu trống. Hãy khôi phục từ file sao lưu trong phần Cài đặt.</div>`;
    } else if (S.fileStatus === 'need-permission') {
      html = `<div class="bao">Cần cho phép để tiếp tục tự động lưu vào file <b>${esc(S.fileHandle.name)}</b>.
        <button class="nut nho chinh" data-act="cap-quyen">Cho phép ghi</button></div>`;
    } else if (S.fileStatus === 'error') {
      html = `<div class="bao loi">Không ghi được vào file tự động lưu. Vào <a href="#/cai-dat">Cài đặt</a> để chọn lại file.</div>`;
    } else if (S.fileStatus !== 'ok' && S.state.people.length && (days == null || days >= 7)) {
      html = `<div class="bao">Dữ liệu đang chỉ nằm trong trình duyệt và ${days == null ? 'chưa được sao lưu lần nào' : `đã ${days} ngày chưa sao lưu`}.
        <button class="nut nho chinh" data-act="sao-luu">Sao lưu ra file</button>
        <a href="#/cai-dat">Bật tự động lưu</a></div>`;
    }
    div.innerHTML = html;
    div.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      try {
        if (b.dataset.act === 'cap-quyen') await S.regrantFile();
        else if (b.dataset.act === 'sao-luu') await App.backupNow();
      } catch (err) {
        App.ui.toast(err.message || String(err), 'loi');
      }
      App.render();
    });
    return div;
  }

  App.render = () => {
    const p = parts();
    const name = ROUTES[p[0] || ''];
    if (!name) return App.go('#/');
    const main = document.getElementById('main');
    const view = document.createElement('div');
    view.className = 'view';
    main.replaceChildren(notice(), view);
    App.renderNav();
    App.views[name](view, p.slice(1));
    window.scrollTo(0, 0);
  };

  let lastHash = null;
  window.addEventListener('hashchange', () => {
    App.render();
    // Chuyển tiêu điểm tới nội dung mới để người dùng bàn phím, trình đọc màn hình biết trang đã đổi.
    if (lastHash !== null) document.getElementById('main').focus({ preventScroll: true });
    lastHash = location.hash;
  });

  async function start() {
    await S.load();
    App.ui.installDatalists();
    // Cập nhật số lượt chưa học bù trên thanh bên sau mỗi thay đổi dữ liệu.
    S.onChange(() => {
      const badge = document.querySelector('.bia-nav .huy-hieu');
      const n = App.M.countChuaHocBu();
      if (badge && n) badge.textContent = n;
      else if (!!badge !== !!n) App.renderNav();
    });
    App.render();
    lastHash = location.hash;
  }

  start();
})(window.App);
