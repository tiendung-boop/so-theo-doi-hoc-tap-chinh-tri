'use strict';
// Trang đầu: bốn bìa sổ với số liệu chính của năm theo dõi, các buổi học gần đây.
(function (App) {
  const { esc, M } = App;

  App.views['tong-quan'] = function (root) {
    const state = App.store.state;
    const year = state.meta.nam;
    const hasPeople = state.people.length > 0;

    const cards = App.DT.map((d) => {
      const agg = M.emptyAgg();
      M.sessionsOf(d.ma, year).forEach((s) => {
        agg.buoi++;
        M.members(s).forEach((p) => M.addToAgg(agg, s, M.rec(s.id, p.id)));
      });
      const quanSo = M.peopleOf(d.ma).length;
      const href = `#/so/${d.ma}`;
      const notes = [];
      if (agg.chuaBu) notes.push(`<a class="canh" href="#/hoc-bu">${agg.chuaBu} lượt chưa học bù</a>`);
      if (agg.KD) notes.push(`<span class="canh">${agg.KD} lượt không đạt</span>`);
      if (!notes.length) notes.push(`<span class="mo">${agg.buoi ? 'Không còn ai chưa học bù' : 'Chưa có buổi học'}</span>`);
      return `<article class="so-the" style="--mau:${d.mau}">
        <a class="bia-nho" href="${href}" aria-label="Mở sổ ${esc(d.ten)}">
          <span class="bia-nho-so">SỔ</span>
          <span class="bia-nho-ten">${esc(d.bia)}</span>
          <span class="bia-nho-nam">${year}</span>
        </a>
        <div class="so-the-than">
          <h3><a href="${href}">${esc(d.ten)}</a></h3>
          <dl class="so-lieu">
            <div><dt>Quân số</dt><dd>${quanSo}</dd></div>
            <div><dt>Buổi học</dt><dd>${agg.buoi}</dd></div>
            <div><dt>Có mặt</dt><dd>${App.fmtPct(App.pct(agg.coMat, agg.luot))}</dd></div>
            <div><dt>Khá, giỏi</dt><dd>${App.fmtPct(App.pct(agg.G + agg.K, agg.kt))}</dd></div>
          </dl>
          <div class="so-the-chan">
            <span class="so-the-ghi">${notes.join('')}</span>
          </div>
        </div>
      </article>`;
    }).join('');

    // Buổi học gần đây: các sổ học chung (cùng mã nhom) gộp thành một dòng.
    const recent = [];
    const seen = new Set();
    for (const s of M.sessionsOf(null, null).reverse()) {
      const key = s.nhom || s.id;
      if (seen.has(key)) continue;
      seen.add(key);
      recent.push(M.group(s));
      if (recent.length === 8) break;
    }

    const start = `<section class="muc khung-mat bat-dau">
        <h2>Bắt đầu sử dụng</h2>
        <ol class="cac-buoc">
          <li><a href="#/cai-dat">Kiểm tra tên trung đoàn, tiểu đoàn và các đơn vị trực thuộc</a> trong phần Cài đặt.</li>
          <li><a href="#/quan-nhan">Nhập danh sách quân nhân</a>: thêm từng người, hoặc điền file Excel mẫu rồi nhập một lần.</li>
          <li>Bấm "Thêm buổi học" ở trang này, chọn một hoặc nhiều đối tượng học chung, rồi điểm danh và ghi kết quả. Kết quả tự ghi vào sổ của từng đối tượng.</li>
        </ol>
        <p>Muốn xem thử trước? <button class="nut nho" data-act="mau">Tạo dữ liệu mẫu</button></p>
      </section>`;

    root.innerHTML = `
      <header class="dau-trang">
        <div>
          <h1>Trang chủ</h1>
          <p class="phu">Năm ${year}. ${esc(state.meta.tieuDoan)}, ${esc(state.meta.trungDoan)}.</p>
        </div>
        <div class="hang-nut">
          <button class="nut chinh nut-lon" data-act="them-buoi"${hasPeople ? '' : ' disabled'}>${App.icon('plus')}Thêm buổi học</button>
        </div>
      </header>
      ${hasPeople ? '' : start}
      <section class="muc">
        <div class="luoi-so">${cards}</div>
        <p class="mo ghi-chu-bang">Tỷ lệ có mặt tính trên tổng lượt quân số của các buổi học trong năm. Khá, giỏi tính trên số lượt có kết quả kiểm tra.</p>
      </section>
      ${
        recent.length
          ? `<section class="muc">
        <h2>Buổi học gần đây</h2>
        <div class="khung-bang"><table class="bang bang-buoi">
          <thead><tr><th class="c-ngay">Ngày</th><th>Đối tượng</th><th>Nội dung, chuyên đề</th><th class="so">Có mặt</th><th class="so">Đã có kết quả</th></tr></thead>
          <tbody>${recent
            .map((g) => {
              const s = g[0];
              const st = M.groupStats(g);
              const href = `#/buoi/${s.id}`;
              return `<tr class="dong-link" data-href="${href}">
                <td class="c-ngay"><a href="${href}">${App.fmtDate(s.ngay)}</a></td>
                <td class="cac-dt">${g.map((x) => { const d = App.dt(x.dt); return `<span class="nhan-so" style="--mau:${d.mau}">${esc(d.ngan)}</span>`; }).join('')}</td>
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
      if (b && b.dataset.act === 'them-buoi') return App.addSessionDialog();
      if (b && b.dataset.act === 'mau') return App.taoDuLieuMau();
      const tr = e.target.closest('tr[data-href]');
      if (tr && !e.target.closest('a')) App.go(tr.dataset.href);
    });
  };
})(window.App);
