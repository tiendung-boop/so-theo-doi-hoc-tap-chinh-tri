'use strict';
// Trang đầu: mục lục bốn sổ với số liệu chính của năm theo dõi, các buổi học gần đây.
(function (App) {
  const { esc, M, ui } = App;

  App.views['tong-quan'] = function (root) {
    const state = App.store.state;
    const year = state.meta.nam;
    const hasPeople = state.people.length > 0;

    const rows = App.DT.map((d) => {
      const agg = M.emptyAgg();
      const sessions = M.sessionsOf(d.ma, year);
      sessions.forEach((s) => {
        agg.buoi++;
        M.members(s).forEach((p) => M.addToAgg(agg, s, M.rec(s.id, p.id)));
      });
      return { d, agg, quanSo: M.peopleOf(d.ma).length };
    });

    const recent = M.sessionsOf(null, null).slice(-8).reverse();

    const start = `<section class="muc">
        <h2>Bắt đầu sử dụng</h2>
        <ol class="cac-buoc">
          <li><a href="#/cai-dat">Kiểm tra tên trung đoàn, tiểu đoàn và các đơn vị trực thuộc</a> trong phần Cài đặt.</li>
          <li><a href="#/quan-nhan">Nhập danh sách quân nhân</a>: thêm từng người, hoặc điền file Excel mẫu rồi nhập một lần.</li>
          <li>Mở từng sổ, thêm buổi học, điểm danh và ghi kết quả kiểm tra. Dòng Tổng được tính tự động.</li>
        </ol>
        <p>Muốn xem thử trước? <button class="nut nho" data-act="mau">Tạo dữ liệu mẫu</button></p>
      </section>`;

    root.innerHTML = `
      <header class="dau-trang">
        <div>
          <h1>Năm ${year}</h1>
          <p class="phu">${esc(state.meta.tieuDoan)}, ${esc(state.meta.trungDoan)}.</p>
        </div>
      </header>
      ${hasPeople ? '' : start}
      <section class="muc">
        <h2>Các sổ theo dõi</h2>
        <div class="khung-bang"><table class="bang bang-muc-luc">
          <thead><tr>
            <th>Sổ</th><th class="so">Quân số</th><th class="so">Buổi học</th><th class="so">Có mặt</th>
            <th class="so">Khá, giỏi</th><th class="so">Không đạt</th><th class="so">Chưa học bù</th><th></th>
          </tr></thead>
          <tbody>${rows
            .map(
              ({ d, agg, quanSo }) => `<tr>
              <td class="ten"><a href="#/so/${d.ma}">${esc(d.ten)}</a></td>
              <td class="so">${quanSo}</td>
              <td class="so">${agg.buoi}</td>
              <td class="so">${App.fmtPct(App.pct(agg.coMat, agg.luot))}</td>
              <td class="so">${App.fmtPct(App.pct(agg.G + agg.K, agg.kt))}</td>
              <td class="so">${agg.KD ? `<span class="canh">${agg.KD}</span>` : agg.kt ? 0 : '–'}</td>
              <td class="so">${agg.chuaBu ? `<a class="canh" href="#/hoc-bu">${agg.chuaBu}</a>` : 0}</td>
              <td class="c-nut"><button class="nut nho" data-act="them-buoi" data-dt="${d.ma}"${quanSo ? '' : ' disabled'}>Thêm buổi học</button></td>
            </tr>`
            )
            .join('')}</tbody>
        </table></div>
        <p class="mo ghi-chu-bang">Tỷ lệ có mặt tính trên tổng lượt quân số của các buổi học. Khá, giỏi tính trên số lượt có kết quả kiểm tra.</p>
      </section>
      ${
        recent.length
          ? `<section class="muc">
        <h2>Buổi học gần đây</h2>
        <div class="khung-bang"><table class="bang bang-buoi">
          <thead><tr><th class="c-ngay">Ngày</th><th>Sổ</th><th>Nội dung, chuyên đề</th><th class="so">Có mặt</th><th class="so">Đã có kết quả</th></tr></thead>
          <tbody>${recent
            .map((s) => {
              const st = M.sessionStats(s);
              const href = `#/so/${s.dt}/buoi/${s.id}`;
              return `<tr class="dong-link" data-href="${href}">
                <td class="c-ngay"><a href="${href}">${App.fmtDate(s.ngay)}</a></td>
                <td>${esc(App.dt(s.dt).ngan)}</td>
                <td>${s.noiDung ? esc(s.noiDung) : '<span class="mo">Chưa ghi nội dung</span>'}</td>
                <td class="so">${st.coMat}/${st.luot}${st.chuaDD ? ` <span class="canh">${st.chuaDD} chưa điểm danh</span>` : ''}</td>
                <td class="so">${s.coKiemTra ? `${st.kt}/${st.luot}` : '<span class="mo">Không kiểm tra</span>'}</td>
              </tr>`;
            })
            .join('')}</tbody></table></div>
      </section>`
          : ''
      }`;

    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (b && b.dataset.act === 'them-buoi') return App.addSessionDialog(App.dt(b.dataset.dt));
      if (b && b.dataset.act === 'mau') return App.taoDuLieuMau();
      const tr = e.target.closest('tr[data-href]');
      if (tr && !e.target.closest('a')) App.go(tr.dataset.href);
    });
  };
})(window.App);
