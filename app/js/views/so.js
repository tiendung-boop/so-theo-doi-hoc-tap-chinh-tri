'use strict';
// Sổ theo dõi của một đối tượng: danh sách buổi học và màn hình điểm danh, nhập kết quả từng buổi.
(function (App) {
  const { esc, M, ui } = App;

  App.views.so = function (root, params) {
    const dt = App.dt(params[0]);
    if (!dt) return App.go('#/');
    if (params[1] === 'buoi') return renderEditor(root, dt, params[2]);
    return renderList(root, dt);
  };

  // ---------- Danh sách buổi học ----------

  function ktSummary(st) {
    if (!st.kt) return '<span class="mo">Chưa có kết quả</span>';
    return App.XL.map((x) => `<span class="kq">${ui.xlChip(x.ma)} ${st[x.ma]}</span>`).join(' ');
  }

  function renderList(root, dt) {
    const state = App.store.state;
    const year = App.viewState.year || state.meta.nam;
    const people = M.peopleOf(dt.ma);
    const sessions = M.sessionsOf(dt.ma, year).reverse();
    const years = M.years();

    let body;
    if (!people.length && !sessions.length) {
      body = ui.empty(
        'Sổ chưa có quân nhân',
        `Thêm các đồng chí thuộc đối tượng ${esc(dt.ten)} trong danh sách quân nhân, hoặc nhập cả danh sách từ file Excel.`,
        `<a class="nut chinh" href="#/quan-nhan">Mở danh sách quân nhân</a>`
      );
    } else if (!sessions.length) {
      body = ui.empty(
        `Chưa có buổi học nào trong năm ${year}`,
        `Tạo buổi học đầu tiên để bắt đầu điểm danh và ghi kết quả cho ${people.length} đồng chí.`,
        `<button class="nut chinh" data-act="them-buoi">Thêm buổi học</button>`
      );
    } else {
      body = `<div class="khung-bang"><table class="bang bang-buoi">
        <thead><tr>
          <th class="c-ngay">Ngày</th><th>Nội dung, chuyên đề</th><th class="so">Quân số</th>
          <th class="so">Có mặt</th><th class="so">Vắng</th><th>Kết quả kiểm tra</th><th class="so">Chưa học bù</th>
        </tr></thead>
        <tbody>${sessions
          .map((s) => {
            const st = M.sessionStats(s);
            const href = `#/so/${dt.ma}/buoi/${s.id}`;
            return `<tr class="dong-link" data-href="${href}">
              <td class="c-ngay"><a href="${href}">${App.fmtDate(s.ngay)}</a></td>
              <td>${s.noiDung ? esc(s.noiDung) : '<span class="mo">Chưa ghi nội dung</span>'}</td>
              <td class="so">${st.luot}</td>
              <td class="so">${st.coMat} <span class="mo">${App.fmtPct(App.pct(st.coMat, st.luot))}</span></td>
              <td class="so">${st.vang}</td>
              <td>${s.coKiemTra ? ktSummary(st) : '<span class="mo">Không kiểm tra</span>'}</td>
              <td class="so">${st.chuaBu ? `<span class="canh">${st.chuaBu}</span>` : '0'}</td>
            </tr>`;
          })
          .join('')}</tbody></table></div>`;
    }

    root.innerHTML = `
      <header class="dau-trang">
        <div>
          <h1>Sổ ${esc(dt.ten)}</h1>
          <p class="phu">Năm ${year} có ${sessions.length} buổi học. Đang theo dõi ${people.length} đồng chí.</p>
        </div>
        <div class="hang-nut">
          <label class="nhan-ngang">Năm <select data-ch="year">${ui.options(
            years.map((y) => ({ value: y, label: y })),
            year
          )}</select></label>
          <a class="nut" href="#/in/${dt.ma}">Xem và in sổ</a>
          <button class="nut chinh" data-act="them-buoi">Thêm buổi học</button>
        </div>
      </header>
      ${body}`;

    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="them-buoi"]')) return addSessionDialog(dt);
      const tr = e.target.closest('tr[data-href]');
      if (tr && !e.target.closest('a')) App.go(tr.dataset.href);
    });
    root.addEventListener('change', (e) => {
      if (e.target.dataset.ch === 'year') {
        App.viewState.year = Number(e.target.value);
        App.render();
      }
    });
  }

  function unitCheckboxes(dt, checkedAll) {
    const units = App.store.state.units
      .map((u) => ({ u, n: M.peopleOf(dt.ma, { unitId: u.id }).length }))
      .filter((x) => x.n > 0);
    if (!units.length) return '<p class="canh">Chưa có quân nhân nào thuộc đối tượng này.</p>';
    return `<div class="luoi-chon">${units
      .map(
        ({ u, n }) =>
          `<label class="o-chon"><input type="checkbox" name="units" data-multi="1" value="${u.id}"${
            checkedAll ? ' checked' : ''
          }> ${esc(u.ten)} <span class="mo">(${n} đ/c)</span></label>`
      )
      .join('')}</div>`;
  }

  function addSessionDialog(dt) {
    ui.modal({
      title: `Thêm buổi học: ${dt.ten}`,
      body: `
        <div class="luoi-form">
          <label>Ngày học <input type="date" name="ngay" value="${App.todayISO()}" required autofocus></label>
          <label class="o-chon dong-duoi"><input type="checkbox" name="coKiemTra" checked> Có kiểm tra</label>
          <label class="ca-dong">Nội dung, chuyên đề <input name="noiDung" placeholder="Ví dụ: Bài 3. Truyền thống của Quân đội nhân dân Việt Nam"></label>
        </div>
        <fieldset class="nhom"><legend>Đơn vị tham gia</legend>${unitCheckboxes(dt, true)}</fieldset>`,
      actions: [
        { label: 'Huỷ' },
        {
          label: 'Tạo buổi học',
          kind: 'chinh',
          submit: true,
          onClick: (dlg) => {
            const f = ui.formData(dlg);
            if (!f.ngay) {
              ui.toast('Chọn ngày học.', 'loi');
              return false;
            }
            const unitIds = new Set(f.units || []);
            const members = M.peopleOf(dt.ma).filter((p) => unitIds.has(p.unitId)).map((p) => p.id);
            if (!members.length) {
              ui.toast('Chọn ít nhất một đơn vị có quân nhân.', 'loi');
              return false;
            }
            const s = M.createSession({ dt: dt.ma, ngay: f.ngay, noiDung: f.noiDung, coKiemTra: f.coKiemTra, members });
            if (App.yearOf(s.ngay) !== (App.viewState.year || App.store.state.meta.nam)) App.viewState.year = App.yearOf(s.ngay);
            App.go(`#/so/${dt.ma}/buoi/${s.id}`);
          },
        },
      ],
    });
  }
  App.addSessionDialog = addSessionDialog;

  // ---------- Điểm danh, nhập kết quả một buổi học ----------

  function rowHtml(s, p, i) {
    const r = M.rec(s.id, p.id) || {};
    const v = r.dd === 'V';
    const coDiem = typeof r.diem === 'number';
    const xl = M.xepLoai(r);
    const cls = r.dd === 'C' ? 'co-mat' : v ? 'vang' : 'chua';
    const ten = esc(p.hoTen);
    return `<tr data-pid="${p.id}" class="${cls}">
      <td class="so">${i + 1}</td>
      <td class="ten">${ten}${p.active === false ? ' <span class="mo">(ngừng theo dõi)</span>' : ''}</td>
      <td>${esc(p.capBac)}</td>
      <td>${esc(M.unitName(p.unitId))}</td>
      <td class="o-dd"><button type="button" class="dd dd-c" data-act="dd" data-v="C" aria-pressed="${r.dd === 'C'}" aria-label="Có mặt: ${ten}">${r.dd === 'C' ? 'x' : ''}</button></td>
      <td class="o-dd"><button type="button" class="dd dd-v" data-act="dd" data-v="V" aria-pressed="${v}" aria-label="Vắng: ${ten}">${v ? 'x' : ''}</button></td>
      <td><input class="o-nhap" name="lyDo" list="dl-lydo" value="${esc(r.lyDo)}"${v ? '' : ' disabled'} aria-label="Lý do vắng: ${ten}"></td>
      <td class="kt"><input class="o-nhap o-diem" name="diem" inputmode="decimal" autocomplete="off" value="${coDiem ? App.fmtNum(r.diem) : ''}" aria-label="Điểm kiểm tra: ${ten}"></td>
      <td class="kt"><select class="o-nhap" name="xl"${coDiem ? ' disabled' : ''} aria-label="Xếp loại: ${ten}">${ui.options(
        [{ value: '', label: '' }].concat(App.XL.map((x) => ({ value: x.ma, label: x.ky }))),
        xl || ''
      )}</select></td>
      <td><input type="date" class="o-nhap${r.bu ? '' : ' chua-co'}" name="bu" value="${r.bu || ''}"${v ? '' : ' disabled'} aria-label="Ngày học bù: ${ten}"></td>
    </tr>`;
  }

  function frac(a, b) {
    return `<b>${a}/${b}</b> đ/c`;
  }

  function footerHtml(s, unitId) {
    const st = M.sessionStats(s, unitId);
    const label = unitId ? `Tổng ${esc(M.unitName(unitId))}` : 'Tổng';
    const kt = App.XL.map(
      (x) =>
        `<span class="kt-dong">${ui.xlChip(x.ma)}<span>${st[x.ma]}/${st.kt}</span><span>${App.fmtPct(App.pct(st[x.ma], st.kt))}</span></span>`
    ).join('');
    return `<tr class="tong">
      <td colspan="4" class="tong-nhan">${label}</td>
      <td colspan="3">Có mặt ${frac(st.coMat, st.luot)} <span class="mo">${App.fmtPct(App.pct(st.coMat, st.luot))}</span><br>
        Vắng ${frac(st.vang, st.luot)}${st.chuaDD ? `<br><span class="canh">Chưa điểm danh ${st.chuaDD} đ/c</span>` : ''}</td>
      <td colspan="2" class="kt"><div class="kt-luoi">${kt}</div></td>
      <td>Đã học bù ${frac(st.daBu, st.vang)}<br>Chưa học ${frac(st.chuaBu, st.vang)}</td>
    </tr>`;
  }

  function renderEditor(root, dt, sid) {
    const s = M.session(sid);
    if (!s || s.dt !== dt.ma) {
      ui.toast('Không tìm thấy buổi học này.', 'loi');
      return App.go(`#/so/${dt.ma}`);
    }
    let unitFilter = '';
    let search = '';

    const unitsInSession = () => {
      const ids = new Set(M.members(s).map((p) => p.unitId));
      return App.store.state.units.filter((u) => ids.has(u.id));
    };

    function draw() {
      const members = M.members(s);
      root.innerHTML = `
        <header class="dau-trang">
          <div>
            <a class="lui" href="#/so/${dt.ma}">Sổ ${esc(dt.ten)}</a>
            <h1 data-ref="tieu-de">Buổi học ngày ${App.fmtDate(s.ngay)}</h1>
          </div>
          <div class="hang-nut">
            <button class="nut" data-act="ds">Danh sách tham gia</button>
            <button class="nut nguy-hiem" data-act="xoa">Xoá buổi học</button>
          </div>
        </header>
        <section class="thong-tin-buoi" data-ref="info">
          <label>Ngày học <input type="date" name="ngay" value="${s.ngay}"></label>
          <label>Nội dung, chuyên đề <input name="noiDung" value="${esc(s.noiDung)}"></label>
          <label>Ghi chú <input name="ghiChu" value="${esc(s.ghiChu)}"></label>
          <label class="o-chon"><input type="checkbox" name="coKiemTra"${s.coKiemTra ? ' checked' : ''}> Có kiểm tra</label>
        </section>
        <div class="thanh-cong-cu">
          <button class="nut" data-act="tat-ca-co-mat">Ghi có mặt cho người chưa điểm danh</button>
          <label class="nhan-ngang">Đơn vị <select data-ch="unit">${ui.options(
            [{ value: '', label: 'Tất cả' }].concat(unitsInSession().map((u) => ({ value: u.id, label: u.ten }))),
            unitFilter
          )}</select></label>
          <input type="search" data-ch="search" placeholder="Tìm theo tên" value="${esc(search)}" aria-label="Tìm theo tên">
          <span class="meo">Nhập điểm rồi nhấn Enter để chuyển xuống người tiếp theo.</span>
        </div>
        ${
          members.length
            ? `<div class="khung-bang cuon">
          <table class="bang bang-dd${s.coKiemTra ? '' : ' khong-kt'}">
            <thead><tr>
              <th class="so w-tt">TT</th><th>Họ và tên</th><th class="w-cb">Cấp bậc</th><th class="w-dv">Đơn vị</th>
              <th class="w-dd">Có mặt</th><th class="w-dd">Vắng</th><th class="w-ld">Lý do vắng</th>
              <th class="kt w-diem">Điểm</th><th class="kt w-xl">Xếp loại</th><th class="w-bu">Ngày học bù, học vét</th>
            </tr></thead>
            <tbody>${members.map((p, i) => rowHtml(s, p, i)).join('')}</tbody>
            <tfoot>${footerHtml(s, unitFilter)}</tfoot>
          </table></div>`
            : ui.empty(
                'Buổi học chưa có người tham gia',
                'Bấm "Danh sách tham gia" để chọn các đồng chí học buổi này.',
                ''
              )
        }`;
      applyFilter();
    }

    function applyFilter() {
      const q = App.norm(search);
      let i = 0;
      App.$$('tbody tr[data-pid]', root).forEach((tr) => {
        const p = M.person(tr.dataset.pid);
        const show = (!unitFilter || p.unitId === unitFilter) && (!q || App.norm(p.hoTen).includes(q));
        tr.hidden = !show;
        if (show) tr.cells[0].textContent = ++i;
      });
    }

    function refreshFooter() {
      const tf = App.$('tfoot', root);
      if (tf) tf.innerHTML = footerHtml(s, unitFilter);
    }

    function redrawRow(pid, focusSel) {
      const tr = App.$(`tr[data-pid="${pid}"]`, root);
      if (!tr) return;
      const idx = tr.cells[0].textContent;
      const tmp = document.createElement('tbody');
      tmp.innerHTML = rowHtml(s, M.person(pid), 0);
      const nr = tmp.firstElementChild;
      nr.cells[0].textContent = idx;
      nr.hidden = tr.hidden;
      tr.replaceWith(nr);
      if (focusSel) {
        const f = App.$(focusSel, nr);
        if (f) f.focus();
      }
    }

    function focusNext(input, dir) {
      const rows = App.$$('tbody tr[data-pid]', root).filter((r) => !r.hidden);
      const tr = input.closest('tr');
      const i = rows.indexOf(tr) + dir;
      if (i < 0 || i >= rows.length) return;
      const target = App.$(`[name="${input.name}"]`, rows[i]);
      if (target && !target.disabled) {
        target.focus();
        if (target.select) target.select();
      }
    }

    draw();

    root.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'dd') {
        const pid = b.closest('tr').dataset.pid;
        const cur = (M.rec(s.id, pid) || {}).dd;
        const v = b.dataset.v;
        if (cur === v) M.setRec(s.id, pid, { dd: null, lyDo: null, bu: null });
        else if (v === 'C') M.setRec(s.id, pid, { dd: 'C', lyDo: null, bu: null });
        else M.setRec(s.id, pid, { dd: 'V' });
        redrawRow(pid, `[data-v="${v}"]`);
        refreshFooter();
      } else if (act === 'tat-ca-co-mat') {
        let n = 0;
        App.$$('tbody tr[data-pid]', root).forEach((tr) => {
          if (tr.hidden) return;
          const pid = tr.dataset.pid;
          if (!(M.rec(s.id, pid) || {}).dd) {
            M.setRec(s.id, pid, { dd: 'C' });
            redrawRow(pid);
            n++;
          }
        });
        refreshFooter();
        ui.toast(n ? `Đã ghi có mặt cho ${n} đồng chí.` : 'Tất cả đã được điểm danh.');
      } else if (act === 'ds') {
        membersDialog(dt, s, draw);
      } else if (act === 'xoa') {
        const st = M.sessionStats(s);
        const ok = await ui.confirm(
          `Xoá buổi học ngày ${App.fmtDate(s.ngay)} cùng toàn bộ điểm danh và kết quả của ${st.luot} đồng chí? Không thể hoàn tác.`,
          { ok: 'Xoá buổi học', danger: true }
        );
        if (ok) {
          M.deleteSession(s.id);
          ui.toast('Đã xoá buổi học.');
          App.go(`#/so/${dt.ma}`);
        }
      }
    });

    root.addEventListener('keydown', (e) => {
      const t = e.target;
      if (t.name === 'diem' && (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        focusNext(t, e.key === 'ArrowUp' ? -1 : 1);
      } else if (t.name === 'lyDo' && e.key === 'Enter') {
        e.preventDefault();
        focusNext(t, 1);
      }
    });

    root.addEventListener('input', (e) => {
      if (e.target.dataset.ch === 'search') {
        search = e.target.value;
        applyFilter();
      }
    });

    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.ch === 'unit') {
        unitFilter = t.value;
        applyFilter();
        refreshFooter();
        return;
      }
      if (t.closest('[data-ref="info"]')) {
        if (t.name === 'ngay') {
          if (!t.value) {
            t.value = s.ngay;
            return ui.toast('Ngày học không được để trống.', 'loi');
          }
          s.ngay = t.value;
          App.$('[data-ref="tieu-de"]', root).textContent = `Buổi học ngày ${App.fmtDate(s.ngay)}`;
        } else if (t.name === 'coKiemTra') {
          s.coKiemTra = t.checked;
          App.$('table.bang-dd', root) && App.$('table.bang-dd', root).classList.toggle('khong-kt', !s.coKiemTra);
          refreshFooter();
        } else {
          s[t.name] = t.value.trim();
        }
        App.store.save();
        return;
      }
      const tr = t.closest('tr[data-pid]');
      if (!tr) return;
      const pid = tr.dataset.pid;
      if (t.name === 'lyDo') M.setRec(s.id, pid, { lyDo: t.value.trim() });
      else if (t.name === 'bu') {
        M.setRec(s.id, pid, { bu: t.value });
        t.classList.toggle('chua-co', !t.value);
      } else if (t.name === 'xl') M.setRec(s.id, pid, { xl: t.value });
      else if (t.name === 'diem') {
        const n = App.parseNum(t.value);
        const sel = App.$('select[name="xl"]', tr);
        if (Number.isNaN(n) || (n != null && (n < 0 || n > 10))) {
          ui.toast('Điểm phải là số từ 0 đến 10, ví dụ 7,5.', 'loi');
          const r = M.rec(s.id, pid) || {};
          t.value = typeof r.diem === 'number' ? App.fmtNum(r.diem) : '';
          return;
        }
        const r = M.setRec(s.id, pid, n == null ? { diem: null } : { diem: n, xl: null });
        if (n != null) t.value = App.fmtNum(n);
        sel.value = M.xepLoai(r) || '';
        sel.disabled = n != null;
      }
      refreshFooter();
    });
  }

  // Chọn những ai học buổi này. Quân nhân bị bỏ khỏi danh sách sẽ mất điểm danh của buổi đó.
  function membersDialog(dt, s, onDone) {
    const current = new Set(s.members);
    const candidates = M.sortPeople(
      App.store.state.people.filter((p) => current.has(p.id) || (p.dt === dt.ma && p.active !== false))
    );
    const byUnit = new Map();
    candidates.forEach((p) => {
      if (!byUnit.has(p.unitId)) byUnit.set(p.unitId, []);
      byUnit.get(p.unitId).push(p);
    });
    const body = Array.from(byUnit.entries())
      .map(
        ([uid, list]) => `<fieldset class="nhom">
          <legend><label class="o-chon"><input type="checkbox" data-unit="${uid}"> ${esc(M.unitName(uid) || 'Chưa có đơn vị')}</label></legend>
          <div class="luoi-chon">${list
            .map(
              (p) =>
                `<label class="o-chon"><input type="checkbox" name="m" data-multi="1" data-u="${uid}" value="${p.id}"${
                  current.has(p.id) ? ' checked' : ''
                }> ${esc(p.hoTen)}${p.dt !== dt.ma ? ` <span class="mo">(${esc(App.dt(p.dt).ngan)})</span>` : ''}</label>`
            )
            .join('')}</div></fieldset>`
      )
      .join('');

    const syncUnitBoxes = (dlg) =>
      App.$$('[data-unit]', dlg).forEach((ub) => {
        const boxes = App.$$(`[data-u="${ub.dataset.unit}"]`, dlg);
        const n = boxes.filter((b) => b.checked).length;
        ub.checked = n === boxes.length;
        ub.indeterminate = n > 0 && n < boxes.length;
      });

    ui.modal({
      title: `Danh sách tham gia buổi ${App.fmtDate(s.ngay)}`,
      wide: true,
      body: body || '<p>Chưa có quân nhân nào thuộc đối tượng này.</p>',
      onOpen: (dlg) => {
        syncUnitBoxes(dlg);
        dlg.addEventListener('change', (e) => {
          if (e.target.dataset.unit) {
            App.$$(`[data-u="${e.target.dataset.unit}"]`, dlg).forEach((b) => (b.checked = e.target.checked));
          }
          syncUnitBoxes(dlg);
        });
      },
      actions: [
        { label: 'Huỷ' },
        {
          label: 'Lưu danh sách',
          kind: 'chinh',
          submit: true,
          onClick: async (dlg) => {
            const chosen = new Set(ui.formData(dlg).m || []);
            const removed = s.members.filter((pid) => !chosen.has(pid));
            const removedWithData = removed.filter((pid) => M.rec(s.id, pid));
            if (removedWithData.length) {
              const ok = await ui.confirm(
                `${removedWithData.length} đồng chí bị bỏ khỏi danh sách đã có điểm danh hoặc kết quả. Dữ liệu đó sẽ bị xoá. Tiếp tục?`,
                { ok: 'Bỏ và xoá dữ liệu', danger: true }
              );
              if (!ok) return false;
            }
            const recs = App.store.state.records[s.id];
            if (recs) removed.forEach((pid) => delete recs[pid]);
            s.members = M.sortPeople(candidates.filter((p) => chosen.has(p.id))).map((p) => p.id);
            App.store.save();
            onDone();
          },
        },
      ],
    });
  }
})(window.App);
