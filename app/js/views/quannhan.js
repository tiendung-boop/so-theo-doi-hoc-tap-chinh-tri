'use strict';
// Danh sách quân nhân của tiểu đoàn: thêm, sửa, lọc, thao tác hàng loạt, nhập/xuất Excel.
(function (App) {
  const { esc, M, ui } = App;

  App.views['quan-nhan'] = function (root) {
    const vs = (App.viewState.qn = App.viewState.qn || { dt: '', unitId: '', q: '', showInactive: false });
    const selected = new Set();

    function filtered() {
      const q = App.norm(vs.q);
      return M.sortPeople(
        App.store.state.people.filter(
          (p) =>
            (!vs.dt || p.dt === vs.dt) &&
            (!vs.unitId || p.unitId === vs.unitId) &&
            (vs.showInactive || p.active !== false) &&
            (!q || App.norm(p.hoTen).includes(q) || App.norm(p.chucVu).includes(q))
        )
      );
    }

    root.innerHTML = `
      <header class="dau-trang">
        <div>
          <h1>Danh sách quân nhân</h1>
          <p class="phu" data-ref="phu"></p>
        </div>
        <div class="hang-nut">
          <button class="nut" data-act="mau">Tải file Excel mẫu</button>
          <button class="nut" data-act="nhap">Nhập từ Excel</button>
          <button class="nut" data-act="xuat">Xuất Excel</button>
          <button class="nut chinh" data-act="them">Thêm quân nhân</button>
        </div>
      </header>
      <nav class="the-loc" data-ref="tabs" aria-label="Lọc theo đối tượng"></nav>
      <div class="thanh-cong-cu">
        <label class="nhan-ngang">Đơn vị <select data-ch="unitId">${ui.unitOptions(vs.unitId, 'Tất cả')}</select></label>
        <input type="search" data-ch="q" placeholder="Tìm theo tên hoặc chức vụ" value="${esc(vs.q)}" aria-label="Tìm theo tên hoặc chức vụ">
        <label class="o-chon"><input type="checkbox" data-ch="showInactive"${vs.showInactive ? ' checked' : ''}> Hiện cả người đã ngừng theo dõi</label>
      </div>
      <div class="thanh-chon" data-ref="bulk" hidden></div>
      <div data-ref="table"></div>`;

    const $ref = (n) => App.$(`[data-ref="${n}"]`, root);

    function drawTabs() {
      const active = App.store.state.people.filter((p) => p.active !== false);
      const tabs = [{ ma: '', ten: 'Tất cả', n: active.length }].concat(
        App.DT.map((d) => ({ ma: d.ma, ten: d.ten, n: active.filter((p) => p.dt === d.ma).length }))
      );
      $ref('tabs').innerHTML = tabs
        .map(
          (t) =>
            `<button type="button" class="the${vs.dt === t.ma ? ' chon' : ''}" data-tab="${t.ma}" aria-pressed="${
              vs.dt === t.ma
            }">${esc(t.ten)} <span class="dem">${t.n}</span></button>`
        )
        .join('');
      $ref('phu').textContent = `Đang theo dõi ${active.length} đồng chí ở ${App.store.state.units.length} đơn vị.`;
    }

    function drawBulk() {
      const el = $ref('bulk');
      el.hidden = selected.size === 0;
      if (!selected.size) return;
      el.innerHTML = `
        <span>Đã chọn <b>${selected.size}</b> đồng chí</span>
        <select data-bulk="dt" aria-label="Chuyển đối tượng">${ui.options(
          [{ value: '', label: 'Chuyển sang đối tượng…' }].concat(App.DT.map((d) => ({ value: d.ma, label: d.ten }))),
          ''
        )}</select>
        <select data-bulk="unit" aria-label="Chuyển đơn vị">${ui.options(
          [{ value: '', label: 'Chuyển sang đơn vị…' }].concat(App.store.state.units.map((u) => ({ value: u.id, label: u.ten }))),
          ''
        )}</select>
        <button class="nut nho" data-act="ngung">Ngừng theo dõi</button>
        <button class="nut nho" data-act="theo-doi-lai">Theo dõi lại</button>
        <button class="nut nho nguy-hiem" data-act="xoa-chon">Xoá</button>
        <button class="nut nho phang" data-act="bo-chon">Bỏ chọn</button>`;
    }

    function drawTable() {
      const list = filtered();
      for (const id of Array.from(selected)) if (!list.some((p) => p.id === id)) selected.delete(id);
      if (!App.store.state.people.length) {
        $ref('table').innerHTML = ui.empty(
          'Chưa có quân nhân nào',
          'Thêm từng đồng chí, hoặc tải file Excel mẫu, điền danh sách rồi nhập vào một lần.',
          `<button class="nut chinh" data-act="them">Thêm quân nhân</button><button class="nut" data-act="nhap">Nhập từ Excel</button>`
        );
      } else if (!list.length) {
        $ref('table').innerHTML = ui.empty('Không có ai khớp bộ lọc', 'Thử bỏ bớt điều kiện lọc hoặc từ khoá tìm kiếm.', '');
      } else {
        const allChecked = list.every((p) => selected.has(p.id));
        $ref('table').innerHTML = `<div class="khung-bang"><table class="bang bang-qn">
          <thead><tr>
            <th class="c-chon"><input type="checkbox" data-act="chon-het"${allChecked ? ' checked' : ''} aria-label="Chọn tất cả"></th>
            <th class="so">TT</th><th>Họ và tên</th><th>Cấp bậc</th><th>Chức vụ</th><th>Đơn vị</th><th>Đối tượng</th><th>Ghi chú</th><th></th>
          </tr></thead>
          <tbody>${list
            .map(
              (p, i) => `<tr data-pid="${p.id}"${p.active === false ? ' class="ngung"' : ''}>
              <td class="c-chon"><input type="checkbox" data-act="chon"${selected.has(p.id) ? ' checked' : ''} aria-label="Chọn ${esc(p.hoTen)}"></td>
              <td class="so">${i + 1}</td>
              <td class="ten">${esc(p.hoTen)}${p.active === false ? ' <span class="mo">(ngừng theo dõi)</span>' : ''}</td>
              <td>${esc(p.capBac)}</td><td>${esc(p.chucVu)}</td><td>${esc(M.unitName(p.unitId))}</td>
              <td>${esc(App.dt(p.dt).ngan)}</td><td>${esc(p.ghiChu)}</td>
              <td class="c-nut"><button class="nut nho phang" data-act="sua">Sửa</button></td>
            </tr>`
            )
            .join('')}</tbody></table></div>`;
      }
      drawBulk();
    }

    function redraw() {
      drawTabs();
      drawTable();
    }
    redraw();

    root.addEventListener('click', async (e) => {
      const tab = e.target.closest('[data-tab]');
      if (tab) {
        vs.dt = tab.dataset.tab;
        selected.clear();
        return redraw();
      }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      const pid = b.closest('tr') && b.closest('tr').dataset.pid;
      if (act === 'them') personDialog(null, redraw, vs);
      else if (act === 'sua') personDialog(M.person(pid), redraw, vs);
      else if (act === 'mau') App.excel.downloadTemplate();
      else if (act === 'nhap') App.excel.importPeopleDialog(redraw);
      else if (act === 'xuat') App.excel.exportPeople(filtered());
      else if (act === 'chon') {
        b.checked ? selected.add(pid) : selected.delete(pid);
        drawBulk();
      } else if (act === 'chon-het') {
        filtered().forEach((p) => (b.checked ? selected.add(p.id) : selected.delete(p.id)));
        drawTable();
      } else if (act === 'bo-chon') {
        selected.clear();
        drawTable();
      } else if (act === 'ngung' || act === 'theo-doi-lai') {
        const active = act === 'theo-doi-lai';
        selected.forEach((id) => (M.person(id).active = active));
        App.store.save();
        ui.toast(active ? `Đã theo dõi lại ${selected.size} đồng chí.` : `Đã ngừng theo dõi ${selected.size} đồng chí.`);
        selected.clear();
        redraw();
      } else if (act === 'xoa-chon') {
        const ids = Array.from(selected);
        const withData = ids.filter((id) => M.personRecordCount(id) > 0).length;
        const msg =
          `Xoá hẳn ${ids.length} đồng chí khỏi danh sách?` +
          (withData
            ? ` ${withData} người trong số này đã có điểm danh hoặc kết quả, dữ liệu đó cũng bị xoá khỏi các buổi học. Nếu chỉ là ra quân hoặc chuyển đi, hãy dùng "Ngừng theo dõi" để giữ lại số liệu cũ.`
            : '');
        if (await ui.confirm(msg, { ok: 'Xoá hẳn', danger: true })) {
          M.deletePeople(ids);
          ui.toast(`Đã xoá ${ids.length} đồng chí.`);
          selected.clear();
          redraw();
        }
      }
    });

    root.addEventListener('dblclick', (e) => {
      const tr = e.target.closest('tbody tr[data-pid]');
      if (tr && !e.target.closest('input,button')) personDialog(M.person(tr.dataset.pid), redraw, vs);
    });

    root.addEventListener('input', (e) => {
      if (e.target.dataset.ch === 'q') {
        vs.q = e.target.value;
        drawTable();
      }
    });

    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.ch === 'unitId') {
        vs.unitId = t.value;
        drawTable();
      } else if (t.dataset.ch === 'showInactive') {
        vs.showInactive = t.checked;
        drawTable();
      } else if (t.dataset.bulk && t.value) {
        const n = selected.size;
        if (t.dataset.bulk === 'dt') {
          selected.forEach((id) => (M.person(id).dt = t.value));
          ui.toast(`Đã chuyển ${n} đồng chí sang ${App.dt(t.value).ten}. Các buổi học cũ vẫn giữ nguyên số liệu.`);
        } else {
          selected.forEach((id) => (M.person(id).unitId = t.value));
          ui.toast(`Đã chuyển ${n} đồng chí sang ${M.unitName(t.value)}.`);
        }
        App.store.save();
        selected.clear();
        redraw();
      }
    });
  };

  function personDialog(p, onDone, vs) {
    const isNew = !p;
    const v = p || { hoTen: '', capBac: '', chucVu: '', unitId: vs.unitId || '', dt: vs.dt || 'BS1', ghiChu: '', active: true };
    const save = (dlg) => {
      const f = ui.formData(dlg);
      if (!f.hoTen) {
        ui.toast('Nhập họ và tên.', 'loi');
        App.$('[name="hoTen"]', dlg).focus();
        return false;
      }
      if (!f.unitId) {
        ui.toast('Chọn đơn vị.', 'loi');
        return false;
      }
      const data = { hoTen: f.hoTen, capBac: f.capBac, chucVu: f.chucVu, unitId: f.unitId, dt: f.dt, ghiChu: f.ghiChu, active: f.active };
      if (isNew) App.store.state.people.push(Object.assign({ id: App.uid(), thuTu: M.nextThuTu() }, data));
      else Object.assign(p, data);
      App.store.save();
      onDone();
      return true;
    };
    const actions = [{ label: 'Huỷ' }];
    if (isNew)
      actions.push({
        label: 'Lưu và thêm người khác',
        onClick: (dlg) => {
          if (!save(dlg)) return false;
          ui.toast(`Đã thêm ${App.$('[name="hoTen"]', dlg).value.trim()}.`);
          App.$('[name="hoTen"]', dlg).value = '';
          App.$('[name="ghiChu"]', dlg).value = '';
          App.$('[name="hoTen"]', dlg).focus();
          return false;
        },
      });
    actions.push({ label: isNew ? 'Thêm' : 'Lưu', kind: 'chinh', submit: true, onClick: save });

    ui.modal({
      title: isNew ? 'Thêm quân nhân' : `Sửa thông tin: ${p.hoTen}`,
      body: `<div class="luoi-form">
        <label class="ca-dong">Họ và tên <input name="hoTen" value="${esc(v.hoTen)}" autofocus autocomplete="off"></label>
        <label>Cấp bậc <input name="capBac" list="dl-capbac" value="${esc(v.capBac)}" autocomplete="off"></label>
        <label>Chức vụ <input name="chucVu" list="dl-chucvu" value="${esc(v.chucVu)}" autocomplete="off"></label>
        <label>Đơn vị <select name="unitId">${ui.unitOptions(v.unitId, v.unitId ? null : 'Chọn đơn vị')}</select></label>
        <label>Đối tượng <select name="dt">${ui.dtOptions(v.dt)}</select></label>
        <label class="ca-dong">Ghi chú <input name="ghiChu" value="${esc(v.ghiChu)}"></label>
        <label class="o-chon ca-dong"><input type="checkbox" name="active"${v.active !== false ? ' checked' : ''}> Đang theo dõi (bỏ chọn khi ra quân, chuyển đơn vị khác)</label>
      </div>`,
      actions,
    });
  }
})(window.App);
