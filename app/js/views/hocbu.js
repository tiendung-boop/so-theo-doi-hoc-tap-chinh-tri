'use strict';
// Theo dõi học bù, học vét: mọi lượt vắng của các sổ, ghi ngày học bù và kết quả kiểm tra bù.
(function (App) {
  const { esc, M, ui } = App;

  App.views['hoc-bu'] = function (root) {
    const vs = (App.viewState.hb = App.viewState.hb || { dt: '', unitId: '', trangThai: 'chua', year: 0 });
    const selected = new Set();
    const key = (x) => `${x.s.id}|${x.p.id}`;

    function list() {
      return M.absences({ dt: vs.dt, unitId: vs.unitId, trangThai: vs.trangThai, year: vs.year || null });
    }

    root.innerHTML = `
      <header class="dau-trang">
        <div>
          <h1>Học bù, học vét</h1>
          <p class="phu" data-ref="phu"></p>
        </div>
        <div class="hang-nut"><button class="nut" data-act="xuat">${App.icon('download')}Xuất danh sách ra Excel</button></div>
      </header>
      <div class="thanh-cong-cu">
        <label class="nhan-ngang">Đối tượng <select data-ch="dt">${ui.dtOptions(vs.dt, 'Tất cả')}</select></label>
        <label class="nhan-ngang">Đơn vị <select data-ch="unitId">${ui.unitOptions(vs.unitId, 'Tất cả')}</select></label>
        <label class="nhan-ngang">Trạng thái <select data-ch="trangThai">${ui.options(
          [
            { value: 'chua', label: 'Chưa học bù' },
            { value: 'da', label: 'Đã học bù' },
            { value: '', label: 'Tất cả lượt vắng' },
          ],
          vs.trangThai
        )}</select></label>
        <label class="nhan-ngang">Năm <select data-ch="year">${ui.options(
          [{ value: 0, label: 'Tất cả' }].concat(M.years().map((y) => ({ value: y, label: y }))),
          vs.year
        )}</select></label>
      </div>
      <div class="thanh-chon" data-ref="bulk" hidden></div>
      <div data-ref="table"></div>`;
    const $ref = (n) => App.$(`[data-ref="${n}"]`, root);

    function drawBulk() {
      const el = $ref('bulk');
      el.hidden = !selected.size;
      if (!selected.size) return;
      el.innerHTML = `<span>Đã chọn <b>${selected.size}</b> lượt vắng</span>
        <label class="nhan-ngang">Ngày học bù <input type="date" data-ref="ngay-bu" value="${App.todayISO()}"></label>
        <button class="nut nho chinh" data-act="ghi-bu">Ghi ngày học bù cho các lượt đã chọn</button>
        <button class="nut nho phang" data-act="bo-chon">Bỏ chọn</button>`;
    }

    function draw() {
      const rows = list();
      $ref('phu').textContent = `Toàn tiểu đoàn còn ${M.countChuaHocBu()} lượt vắng chưa học bù.`;
      for (const k of Array.from(selected)) if (!rows.some((x) => key(x) === k)) selected.delete(k);
      if (!rows.length) {
        $ref('table').innerHTML = ui.empty(
          vs.trangThai === 'chua' ? 'Không còn ai chưa học bù' : 'Không có lượt vắng nào',
          vs.trangThai === 'chua'
            ? 'Mọi lượt vắng theo bộ lọc hiện tại đều đã được học bù, học vét.'
            : 'Không có lượt vắng nào khớp bộ lọc hiện tại.',
          ''
        );
        return drawBulk();
      }
      const allChecked = rows.every((x) => selected.has(key(x)));
      $ref('table').innerHTML = `<div class="khung-bang"><table class="bang bang-hb">
        <thead><tr>
          <th class="c-chon"><input type="checkbox" data-act="chon-het"${allChecked ? ' checked' : ''} aria-label="Chọn tất cả"></th>
          <th>Họ và tên</th><th>Cấp bậc</th><th>Đơn vị</th><th>Đối tượng</th><th>Buổi học</th><th>Lý do vắng</th>
          <th>Ngày học bù</th><th>Điểm</th><th>Xếp loại</th>
        </tr></thead>
        <tbody>${rows
          .map((x) => {
            const coDiem = typeof x.r.diem === 'number';
            const kt = x.s.coKiemTra;
            return `<tr data-k="${key(x)}"${x.r.bu ? ' class="da-bu"' : ''}>
              <td class="c-chon"><input type="checkbox" data-act="chon"${selected.has(key(x)) ? ' checked' : ''} aria-label="Chọn ${esc(x.p.hoTen)}"></td>
              <td class="ten">${esc(x.p.hoTen)}</td><td>${esc(x.p.capBac)}</td><td>${esc(M.unitName(x.p.unitId))}</td>
              <td><span class="nhan-so" style="--mau:${App.dt(x.s.dt).mau}">${esc(App.dt(x.s.dt).ngan)}</span></td>
              <td><a href="#/so/${x.s.dt}/buoi/${x.s.id}">${App.fmtDate(x.s.ngay)}</a>${x.s.noiDung ? `<span class="mo nd-nho">${esc(x.s.noiDung)}</span>` : ''}</td>
              <td>${esc(x.r.lyDo)}</td>
              <td><input type="date" class="o-nhap${x.r.bu ? '' : ' chua-co'}" name="bu" value="${x.r.bu || ''}" aria-label="Ngày học bù: ${esc(x.p.hoTen)}"></td>
              <td>${kt ? `<input class="o-nhap o-diem" name="diem" inputmode="decimal" autocomplete="off" value="${coDiem ? App.fmtNum(x.r.diem) : ''}" aria-label="Điểm: ${esc(x.p.hoTen)}">` : '<span class="mo">Không KT</span>'}</td>
              <td>${kt ? `<select class="o-nhap" name="xl"${coDiem ? ' disabled' : ''} aria-label="Xếp loại: ${esc(x.p.hoTen)}">${ui.options(
                [{ value: '', label: '' }].concat(App.XL.map((l) => ({ value: l.ma, label: l.ky }))),
                M.xepLoai(x.r) || ''
              )}</select>` : ''}</td>
            </tr>`;
          })
          .join('')}</tbody></table></div>`;
      drawBulk();
    }
    draw();

    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'xuat') App.excel.exportAbsences(list());
      else if (act === 'chon') {
        const k = b.closest('tr').dataset.k;
        b.checked ? selected.add(k) : selected.delete(k);
        drawBulk();
      } else if (act === 'chon-het') {
        list().forEach((x) => (b.checked ? selected.add(key(x)) : selected.delete(key(x))));
        draw();
      } else if (act === 'bo-chon') {
        selected.clear();
        draw();
      } else if (act === 'ghi-bu') {
        const ngay = App.$('[data-ref="ngay-bu"]', root).value;
        if (!ngay) return ui.toast('Chọn ngày học bù.', 'loi');
        selected.forEach((k) => {
          const [sid, pid] = k.split('|');
          M.setRec(sid, pid, { bu: ngay });
        });
        ui.toast(`Đã ghi ngày học bù ${App.fmtDate(ngay)} cho ${selected.size} lượt.`);
        selected.clear();
        draw();
      }
    });

    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.ch) {
        vs[t.dataset.ch] = t.dataset.ch === 'year' ? Number(t.value) : t.value;
        selected.clear();
        return draw();
      }
      const tr = t.closest('tr[data-k]');
      if (!tr) return;
      const [sid, pid] = tr.dataset.k.split('|');
      if (t.name === 'bu') {
        M.setRec(sid, pid, { bu: t.value });
        tr.classList.toggle('da-bu', !!t.value);
        t.classList.toggle('chua-co', !t.value);
        $ref('phu').textContent = `Toàn tiểu đoàn còn ${M.countChuaHocBu()} lượt vắng chưa học bù.`;
      } else if (t.name === 'xl') M.setRec(sid, pid, { xl: t.value });
      else if (t.name === 'diem') {
        const n = App.parseNum(t.value);
        const sel = App.$('select[name="xl"]', tr);
        if (Number.isNaN(n) || (n != null && (n < 0 || n > 10))) {
          ui.toast('Điểm phải là số từ 0 đến 10, ví dụ 7,5.', 'loi');
          const r = M.rec(sid, pid) || {};
          t.value = typeof r.diem === 'number' ? App.fmtNum(r.diem) : '';
          return;
        }
        const r = M.setRec(sid, pid, n == null ? { diem: null } : { diem: n, xl: null });
        if (n != null) t.value = App.fmtNum(n);
        sel.value = M.xepLoai(r) || '';
        sel.disabled = n != null;
      }
    });
  };
})(window.App);
