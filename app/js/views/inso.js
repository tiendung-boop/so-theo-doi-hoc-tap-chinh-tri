'use strict';
// Xem và in sổ theo mẫu giấy: A4 nằm ngang, mỗi trang vài buổi học, cuối mỗi nhóm buổi có dòng Tổng
// và dòng Học bù, học vét như sổ in sẵn của đơn vị.
(function (App) {
  const { esc, M, ui } = App;

  // Sức chứa một trang A4 ngang (lề 10 mm): 190 mm chiều cao trừ tiêu đề và hai dòng tiêu đề bảng
  // còn khoảng 158 mm, chia cho dòng cao 6,2 mm (khai báo trong app.css) được 25 dòng.
  const SUC_CHUA = 25;
  // Dòng Tổng (4 dòng xếp loại) và dòng Học bù chiếm khoảng 5 dòng thường.
  const DONG_TONG = 5;

  const upper = (s) => String(s || '').toLocaleUpperCase('vi');

  App.views.in = function (root, params) {
    const dt = App.dt(params[0] || 'BS1');
    if (!dt) return App.go('#/in/BS1');
    const state = App.store.state;
    const vs = (App.viewState.in = Object.assign(
      { unitId: '', soBuoi: 2, soDong: 22, dongTrong: 0, bia: true, year: state.meta.nam },
      App.viewState.in
    ));

    root.innerHTML = `
      <header class="dau-trang khong-in">
        <div>
          <h1>In sổ ${esc(dt.ten)}</h1>
          <p class="phu">Khi in, chọn khổ giấy A4, hướng ngang. Bản xem trước bên dưới giống hệt bản in.</p>
        </div>
        <div class="hang-nut">
          <button class="nut" data-act="excel">Xuất Excel theo mẫu</button>
          <button class="nut chinh" data-act="in">In sổ</button>
        </div>
      </header>
      <div class="thanh-cong-cu khong-in">
        <label class="nhan-ngang">Sổ <select data-ch="dt">${ui.dtOptions(dt.ma)}</select></label>
        <label class="nhan-ngang">Năm <select data-ch="year">${ui.options(
          M.years().map((y) => ({ value: y, label: y })),
          vs.year
        )}</select></label>
        <label class="nhan-ngang">Đơn vị <select data-ch="unitId">${ui.unitOptions(vs.unitId, 'Cả tiểu đoàn')}</select></label>
        <label class="nhan-ngang">Số buổi mỗi trang <select data-ch="soBuoi">${ui.options(
          [1, 2, 3, 4].map((n) => ({ value: n, label: n })),
          vs.soBuoi
        )}</select></label>
        <label class="nhan-ngang">Số dòng mỗi trang <input type="number" min="10" max="${SUC_CHUA}" data-ch="soDong" value="${vs.soDong}"></label>
        <label class="nhan-ngang">Thêm dòng trống <input type="number" min="0" max="50" data-ch="dongTrong" value="${vs.dongTrong}"></label>
        <label class="o-chon"><input type="checkbox" data-ch="bia"${vs.bia ? ' checked' : ''}> In trang bìa</label>
      </div>
      <div class="xem-truoc" data-ref="pages"></div>`;

    const box = App.$('[data-ref="pages"]', root);
    const draw = () => {
      box.innerHTML = renderPages(dt, vs);
    };
    draw();

    // Thu nhỏ bản xem trước cho vừa chiều ngang khung (A4 ngang rộng 297 mm ≈ 1123 px).
    const PAGE_PX = (297 / 25.4) * 96;
    const fit = () => {
      if (!box.isConnected) return window.removeEventListener('resize', fit);
      box.style.setProperty('--thu-nho', Math.min(1, (box.clientWidth - 4) / PAGE_PX).toFixed(3));
    };
    window.addEventListener('resize', fit);
    fit();

    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'in') window.print();
      else if (b.dataset.act === 'excel') App.excel.exportSo(dt, vs);
    });
    root.addEventListener('change', (e) => {
      const t = e.target;
      const k = t.dataset.ch;
      if (!k) return;
      if (k === 'dt') return App.go(`#/in/${t.value}`);
      if (k === 'bia') vs.bia = t.checked;
      else if (k === 'unitId') vs.unitId = t.value;
      else {
        let n = Number(t.value);
        if (k === 'soDong') n = Math.min(SUC_CHUA, Math.max(10, n || 22));
        if (k === 'dongTrong') n = Math.min(50, Math.max(0, n || 0));
        t.value = n;
        vs[k] = n;
      }
      draw();
    });
  };

  // Danh sách người trong sổ: ai từng tham gia buổi học trong năm, cộng người đang theo dõi (nếu là năm hiện tại).
  App.soPeople = (dt, o) => {
    const sessions = M.sessionsOf(dt.ma, o.year);
    const ids = new Set();
    sessions.forEach((s) => s.members.forEach((id) => ids.add(id)));
    if (o.year === App.store.state.meta.nam) M.peopleOf(dt.ma).forEach((p) => ids.add(p.id));
    return M.sortPeople(Array.from(ids).map(M.person).filter(Boolean)).filter((p) => !o.unitId || p.unitId === o.unitId);
  };

  // Giá trị 4 ô (Có mặt, Vắng, Kiểm tra, Ghi chú) của một người trong một buổi; dùng chung cho in và Excel.
  App.soCells = (s, memberSet, p) => {
    if (!s || !p || !memberSet.has(p.id)) return ['', '', '', ''];
    const r = M.rec(s.id, p.id) || {};
    const kt = !s.coKiemTra ? '' : typeof r.diem === 'number' ? App.fmtNum(r.diem) : r.xl ? App.xl(r.xl).ky : '';
    return [
      r.dd === 'C' ? 'x' : '',
      r.dd === 'V' ? r.lyDo || 'x' : '',
      kt,
      r.bu ? `Học bù ${App.fmtDate(r.bu)}` : '',
    ];
  };

  App.soDateLabel = (s, year) => {
    if (!s) return `Ngày ...... tháng ...... năm ${year}`;
    const [y, m, d] = s.ngay.split('-');
    return `Ngày ${d} tháng ${m} năm ${y}`;
  };

  function headerHtml(chunk, year, showUnit) {
    const r1 = chunk
      .map(
        (s) => `<th colspan="3" class="h-ngay"><div class="h-ngay-dong">${App.soDateLabel(s, year)}</div>
          <div class="h-noi-dung">${s ? esc(s.noiDung) : '.........................................'}</div></th>
          <th rowspan="2" class="h-gc">Ghi chú<br><i>(Ngày, tháng, năm học bù, học vét)</i></th>`
      )
      .join('');
    const r2 = chunk.map(() => '<th>Có mặt</th><th>Vắng</th><th>Kiểm tra</th>').join('');
    return `<thead>
      <tr><th rowspan="2" class="h-tt">TT</th><th rowspan="2">Họ và tên</th>${showUnit ? '<th rowspan="2">Đơn vị</th>' : ''}${r1}</tr>
      <tr>${r2}</tr></thead>`;
  }

  function colgroup(n, showUnit) {
    // Độ rộng tương đối (mm) theo sổ mẫu, trình duyệt tự co giãn cho vừa khổ 277 mm.
    const cols = [8, 44].concat(showUnit ? [24] : []);
    for (let i = 0; i < n; i++) cols.push(12, 12, 14, 24);
    const total = cols.reduce((a, b) => a + b, 0);
    return `<colgroup>${cols.map((w) => `<col style="width:${((w / total) * 100).toFixed(2)}%">`).join('')}</colgroup>`;
  }

  function tongRows(chunk, unitId, showUnit) {
    const span = showUnit ? 3 : 2;
    // Thống kê xếp loại chiếm cả ô Kiểm tra và ô Ghi chú (ô Ghi chú ở dòng Tổng luôn trống)
    // để mỗi mức "G: a/b = x%" nằm gọn trên một dòng như sổ mẫu.
    const tong = chunk
      .map((s) => {
        if (!s) {
          return `<td>..../....<br>đ/c</td><td>..../....<br>đ/c</td>
            <td colspan="2" class="t-kt">${App.XL.map((x) => `${x.ky}: .../... = ...%`).join('<br>')}</td>`;
        }
        const st = M.sessionStats(s, unitId);
        const kt = s.coKiemTra
          ? App.XL.map((x) => `${x.ky}: ${st[x.ma]}/${st.kt} = ${App.fmtPct(App.pct(st[x.ma], st.kt))}`).join('<br>')
          : '';
        // <wbr> cho phép xuống dòng sau dấu "/" khi in nhiều buổi một trang, cột hẹp.
        return `<td>${st.coMat}/<wbr>${st.luot}<br>đ/c</td><td>${st.vang}/<wbr>${st.luot}<br>đ/c</td><td colspan="2" class="t-kt">${kt}</td>`;
      })
      .join('');
    const bu = chunk
      .map((s) => {
        if (!s) return `<td colspan="4" class="t-bu">Đã học: ..../.... đ/c<br>Chưa học: ..../.... đ/c</td>`;
        const st = M.sessionStats(s, unitId);
        return `<td colspan="4" class="t-bu">Đã học: ${st.daBu}/${st.vang} đ/c<br>Chưa học: ${st.chuaBu}/${st.vang} đ/c</td>`;
      })
      .join('');
    return `<tr class="d-tong"><td colspan="${span}" class="t-nhan">Tổng:</td>${tong}</tr>
      <tr class="d-bu"><td colspan="${span}" class="t-nhan">Học bù, học vét</td>${bu}</tr>`;
  }

  function coverHtml(dt, o) {
    const m = App.store.state.meta;
    return `<section class="trang trang-bia">
      <div class="bia-khung-in">
        <div class="bia-in-dv">
          <div>${esc(upper(m.trungDoan))}</div>
          <div class="gach-chan">${esc(upper(m.tieuDoan))}</div>
          ${o.unitId ? `<div>${esc(upper(M.unitName(o.unitId)))}</div>` : ''}
        </div>
        <div class="bia-in-giua">
          <div class="bia-in-so">SỔ</div>
          <div class="bia-in-ten">ĐĂNG KÝ THEO DÕI KẾT QUẢ<br>HỌC TẬP CHÍNH TRỊ CỦA ${esc(dt.bia)}</div>
        </div>
        <div class="bia-in-nam">NĂM ${o.year}</div>
      </div>
    </section>`;
  }

  function renderPages(dt, o) {
    const sessions = M.sessionsOf(dt.ma, o.year);
    const people = App.soPeople(dt, o);
    const rows = people.concat(new Array(o.dongTrong).fill(null));
    const showUnit = !o.unitId;
    let chunks = App.chunk(sessions, o.soBuoi);
    if (!chunks.length) chunks = [[]];
    // Nhóm cuối thiếu buổi thì để trống cột như sổ giấy, cán bộ có thể ghi tay.
    chunks = chunks.map((c) => c.concat(new Array(o.soBuoi - c.length).fill(null)));

    const out = [];
    if (o.bia) out.push(coverHtml(dt, o));
    chunks.forEach((chunk) => {
      const sets = chunk.map((s) => (s ? new Set(s.members) : null));
      const rowChunks = rows.length ? App.chunk(rows.map((p, i) => ({ p, i })), o.soDong) : [[]];
      const last = rowChunks[rowChunks.length - 1];
      const tongOnOwnPage = last.length + DONG_TONG > SUC_CHUA;
      rowChunks.forEach((rc, ri) => {
        const isLast = ri === rowChunks.length - 1;
        const body = rc
          .map(({ p, i }) => {
            const cells = chunk
              .map((s, k) =>
                App.soCells(s, sets[k] || new Set(), p)
                  .map((v, ci) => `<td class="${ci === 3 ? 'c-gc' : 'c-giua'}${s && p && !sets[k].has(p.id) ? ' ngoai' : ''}">${esc(v)}</td>`)
                  .join('')
              )
              .join('');
            return `<tr><td class="c-giua">${i + 1}.</td><td class="c-ten">${p ? esc(p.hoTen) : ''}</td>${
              showUnit ? `<td class="c-dv">${p ? esc(M.unitName(p.unitId)) : ''}</td>` : ''
            }${cells}</tr>`;
          })
          .join('');
        const withTong = isLast && !tongOnOwnPage;
        out.push(pageHtml(chunk, o, showUnit, body + (withTong ? tongRows(chunk, o.unitId, showUnit) : '')));
        if (isLast && tongOnOwnPage) out.push(pageHtml(chunk, o, showUnit, tongRows(chunk, o.unitId, showUnit)));
      });
    });
    return out.join('');
  }

  function pageHtml(chunk, o, showUnit, body) {
    return `<section class="trang">
      <h2 class="trang-tieu-de">ĐĂNG KÝ THEO DÕI KẾT QUẢ HỌC TẬP CHÍNH TRỊ</h2>
      <table class="so-in">${colgroup(chunk.length, showUnit)}${headerHtml(chunk, o.year, showUnit)}<tbody>${body}</tbody></table>
    </section>`;
  }
})(window.App);
