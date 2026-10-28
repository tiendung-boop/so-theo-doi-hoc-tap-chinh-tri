'use strict';
// Sổ theo dõi của một đối tượng (danh sách buổi học), hộp thoại thêm buổi học (một hoặc nhiều đối tượng
// học chung) và màn hình điểm danh, nhập kết quả cho một buổi học hoặc một nhóm buổi học chung.
(function (App) {
  const { esc, M, ui } = App;

  App.views.so = function (root, params) {
    const dt = App.dt(params[0]);
    if (!dt) return App.go('#/');
    if (params[1] === 'buoi') return renderEditor(root, params[2], dt);
    return renderList(root, dt);
  };

  // Mở từ trang đầu: hiện mọi đối tượng học chung buổi đó.
  App.views.buoi = function (root, params) {
    return renderEditor(root, params[0], null);
  };

  const chip = (d) => `<span class="nhan-so" style="--mau:${d.mau}">${esc(d.ngan)}</span>`;

  // ---------- Danh sách buổi học của một sổ ----------

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
        'Buổi học được tạo ở Trang chủ: bấm "Thêm buổi học", chọn các đối tượng học. Kết quả tự ghi vào sổ này.',
        `<a class="nut chinh" href="#/">Về Trang chủ</a>`
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
            const others = M.group(s).filter((x) => x !== s).map((x) => App.dt(x.dt).ngan);
            return `<tr class="dong-link" data-href="${href}">
              <td class="c-ngay"><a href="${href}">${App.fmtDate(s.ngay)}</a></td>
              <td>${s.noiDung ? esc(s.noiDung) : '<span class="mo">Chưa ghi nội dung</span>'}${
                others.length ? `<span class="mo nd-nho">Học chung với ${esc(others.join(', '))}</span>` : ''
              }</td>
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
          <h1 class="tieu-de-so" style="--mau:${dt.mau}">Sổ ${esc(dt.ten)}</h1>
          <p class="phu">Năm ${year} có ${sessions.length} buổi học. Đang theo dõi ${people.length} đồng chí.</p>
        </div>
        <div class="hang-nut">
          <label class="nhan-ngang">Năm <select data-ch="year">${ui.options(
            years.map((y) => ({ value: y, label: y })),
            year
          )}</select></label>
          <a class="nut" href="#/in/${dt.ma}">${App.icon('printer')}Xem và in sổ</a>
        </div>
      </header>
      ${body}`;

    root.addEventListener('click', (e) => {
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

  // ---------- Thêm buổi học: chọn một hoặc nhiều đối tượng, tự chia vào từng sổ ----------

  App.addSessionDialog = function () {
    const state = App.store.state;
    const active = state.people.filter((p) => p.active !== false);
    const dtCount = (ma) => active.filter((p) => p.dt === ma).length;
    const units = state.units.filter((u) => active.some((p) => p.unitId === u.id));
    if (!active.length) {
      ui.toast('Chưa có quân nhân nào. Hãy nhập danh sách quân nhân trước.', 'loi');
      return App.go('#/quan-nhan');
    }

    const chosen = (dlg) => {
      const f = ui.formData(dlg);
      return { f, dts: new Set(f.dts || []), unitIds: new Set(f.units || []) };
    };

    ui.modal({
      title: 'Thêm buổi học',
      wide: true,
      body: `
        <div class="luoi-form">
          <label>Ngày học <input type="date" name="ngay" value="${App.todayISO()}" required autofocus></label>
          <label class="o-chon dong-duoi"><input type="checkbox" name="coKiemTra" checked> Có kiểm tra</label>
          <label class="ca-dong">Nội dung, chuyên đề <input name="noiDung" placeholder="Ví dụ: Bài 3. Truyền thống của Quân đội nhân dân Việt Nam"></label>
        </div>
        <fieldset class="nhom"><legend>Đối tượng học</legend>
          <div class="luoi-chon">${App.DT.map((d) => {
            const n = dtCount(d.ma);
            return `<label class="o-chon"><input type="checkbox" name="dts" data-multi="1" value="${d.ma}"${n ? '' : ' disabled'}>
              <span class="nhan-so" style="--mau:${d.mau}">${esc(d.ten)}</span> <span class="mo">(${n} đ/c)</span></label>`;
          }).join('')}</div>
          <p class="mo ghi-chu-nho">Chọn nhiều đối tượng nếu học chung. Điểm danh trên một bảng, kết quả tự ghi vào sổ của từng đối tượng.</p>
        </fieldset>
        <fieldset class="nhom"><legend>Đơn vị tham gia</legend>
          <div class="luoi-chon">${units
            .map(
              (u) =>
                `<label class="o-chon"><input type="checkbox" name="units" data-multi="1" value="${u.id}" checked> ${esc(u.ten)} <span class="mo" data-dem="${u.id}"></span></label>`
            )
            .join('')}</div>
        </fieldset>
        <p class="tong-ket" data-ref="tong-ket"></p>`,
      onOpen: (dlg) => {
        const update = () => {
          const { dts, unitIds } = chosen(dlg);
          units.forEach((u) => {
            const n = active.filter((p) => p.unitId === u.id && dts.has(p.dt)).length;
            App.$(`[data-dem="${u.id}"]`, dlg).textContent = dts.size ? `(${n} đ/c)` : '';
          });
          const total = active.filter((p) => dts.has(p.dt) && unitIds.has(p.unitId)).length;
          App.$('[data-ref="tong-ket"]', dlg).innerHTML = dts.size
            ? `Buổi học có <b>${total}</b> đồng chí, ghi vào ${dts.size} sổ.`
            : 'Chọn ít nhất một đối tượng học.';
        };
        dlg.addEventListener('change', update);
        update();
      },
      actions: [
        { label: 'Huỷ' },
        {
          label: 'Tạo buổi học',
          kind: 'chinh',
          submit: true,
          onClick: (dlg) => {
            const { f, dts, unitIds } = chosen(dlg);
            if (!f.ngay) {
              ui.toast('Chọn ngày học.', 'loi');
              return false;
            }
            if (!dts.size) {
              ui.toast('Chọn ít nhất một đối tượng học.', 'loi');
              return false;
            }
            const plans = App.DT.filter((d) => dts.has(d.ma))
              .map((d) => ({ d, members: M.peopleOf(d.ma).filter((p) => unitIds.has(p.unitId)).map((p) => p.id) }))
              .filter((x) => x.members.length);
            if (!plans.length) {
              ui.toast('Các đơn vị đã chọn không có ai thuộc đối tượng này.', 'loi');
              return false;
            }
            const nhom = plans.length > 1 ? App.uid() : null;
            const created = plans.map((x) =>
              M.createSession({ dt: x.d.ma, ngay: f.ngay, noiDung: f.noiDung, coKiemTra: f.coKiemTra, members: x.members, nhom })
            );
            App.viewState.year = App.yearOf(f.ngay);
            App.go(`#/buoi/${created[0].id}`);
          },
        },
      ],
    });
  };

  // ---------- Điểm danh, nhập kết quả một buổi học (hoặc nhóm học chung) ----------

  function rowHtml(s, p, i, multi) {
    const r = M.rec(s.id, p.id) || {};
    const v = r.dd === 'V';
    const coDiem = typeof r.diem === 'number';
    const xl = M.xepLoai(r);
    const cls = r.dd === 'C' ? 'co-mat' : v ? 'vang' : 'chua';
    const ten = esc(p.hoTen);
    return `<tr data-sid="${s.id}" data-pid="${p.id}" data-dt="${s.dt}" class="${cls}">
      <td class="so">${i + 1}</td>
      <td class="ten">${ten}${p.active === false ? ' <span class="mo">(ngừng theo dõi)</span>' : ''}</td>
      <td class="c-nw">${esc(p.capBac)}</td>
      <td class="c-nw">${esc(M.unitName(p.unitId))}</td>
      ${multi ? `<td class="c-nw"><span class="nhan-so" style="--mau:${App.dt(s.dt).mau}" title="${esc(App.dt(s.dt).ten)}">${esc(App.dt(s.dt).kh)}</span></td>` : ''}
      <td class="o-dd"><button type="button" class="dd dd-c" data-act="dd" data-v="C" aria-pressed="${r.dd === 'C'}" aria-label="Có mặt: ${ten}">${App.icon('check')}</button></td>
      <td class="o-dd"><button type="button" class="dd dd-v" data-act="dd" data-v="V" aria-pressed="${v}" aria-label="Vắng: ${ten}">${App.icon('x')}</button></td>
      <td><input class="o-nhap" name="lyDo" list="dl-lydo" value="${esc(r.lyDo)}"${v ? '' : ' disabled'} aria-label="Lý do vắng: ${ten}"></td>
      <td class="kt"><input class="o-nhap o-diem" name="diem" inputmode="decimal" autocomplete="off" value="${coDiem ? App.fmtNum(r.diem) : ''}" aria-label="Điểm kiểm tra: ${ten}"></td>
      <td class="kt"><select class="o-nhap" name="xl"${coDiem ? ' disabled' : ''} aria-label="Xếp loại: ${ten}">${ui.options(
        [{ value: '', label: '' }].concat(App.XL.map((x) => ({ value: x.ma, label: x.ky }))),
        xl || ''
      )}</select></td>
      <td><input type="date" class="o-nhap${r.bu ? '' : ' chua-co'}" name="bu" value="${r.bu || ''}"${v ? '' : ' disabled'} aria-label="Ngày học bù: ${ten}"></td>
    </tr>`;
  }

  const frac = (a, b) => `<b>${a}/${b}</b> đ/c`;

  function renderEditor(root, sid, fromDt) {
    const first = M.session(sid);
    const backHref = fromDt ? `#/so/${fromDt.ma}` : '#/';
    if (!first || (fromDt && first.dt !== fromDt.ma)) {
      ui.toast('Không tìm thấy buổi học này.', 'loi');
      return App.go(backHref);
    }
    let group = M.group(first);
    const multi = () => group.length > 1;
    // Mở từ một sổ: lọc sẵn đối tượng của sổ đó, vẫn đổi được sang xem cả nhóm.
    let dtFilter = fromDt && group.length > 1 ? fromDt.ma : '';
    let unitFilter = '';
    let search = '';
    const sesOf = (id) => group.find((s) => s.id === id);

    const unitsInGroup = () => {
      const ids = new Set();
      group.forEach((s) => M.members(s).forEach((p) => ids.add(p.unitId)));
      return App.store.state.units.filter((u) => ids.has(u.id));
    };

    function footerHtml() {
      const st = M.groupStats(group, dtFilter, unitFilter);
      const parts = [dtFilter && App.dt(dtFilter).ngan, unitFilter && M.unitName(unitFilter)].filter(Boolean);
      const label = `Tổng${parts.length ? ' ' + esc(parts.join(', ')) : ''}`;
      const kt = App.XL.map(
        (x) =>
          `<span class="kt-dong">${ui.xlChip(x.ma)}<span>${st[x.ma]}/${st.kt}</span><span>${App.fmtPct(App.pct(st[x.ma], st.kt))}</span></span>`
      ).join('');
      return `<tr class="tong">
        <td colspan="${multi() ? 5 : 4}" class="tong-nhan">${label}</td>
        <td colspan="3">Có mặt ${frac(st.coMat, st.luot)} <span class="mo">${App.fmtPct(App.pct(st.coMat, st.luot))}</span><br>
          Vắng ${frac(st.vang, st.luot)}${st.chuaDD ? `<br><span class="canh">Chưa điểm danh ${st.chuaDD} đ/c</span>` : ''}</td>
        <td colspan="2" class="kt"><div class="kt-luoi">${kt}</div></td>
        <td>Đã học bù ${frac(st.daBu, st.vang)}<br>Chưa học ${frac(st.chuaBu, st.vang)}</td>
      </tr>`;
    }

    function draw() {
      const s0 = group[0];
      const rows = group.flatMap((s) => M.members(s).map((p) => ({ s, p })));
      const mau = multi() ? 'var(--chinh)' : App.dt(s0.dt).mau;
      root.innerHTML = `
        <header class="dau-trang">
          <div>
            <a class="lui" href="${backHref}">${App.icon('back')}${fromDt ? `Sổ ${esc(fromDt.ten)}` : 'Trang chủ'}</a>
            <h1 class="tieu-de-so" style="--mau:${mau}" data-ref="tieu-de">Buổi học ngày ${App.fmtDate(s0.ngay)}</h1>
            <p class="phu cac-dt">${multi() ? 'Học chung: ' : ''}${group.map((s) => chip(App.dt(s.dt))).join('')}</p>
          </div>
          <div class="hang-nut">
            <button class="nut" data-act="ds">${App.icon('list')}Danh sách tham gia</button>
            <button class="nut nguy-hiem" data-act="xoa">${App.icon('trash')}Xoá buổi học</button>
          </div>
        </header>
        <section class="thong-tin-buoi" data-ref="info">
          <label>Ngày học <input type="date" name="ngay" value="${s0.ngay}"></label>
          <label>Nội dung, chuyên đề <input name="noiDung" value="${esc(s0.noiDung)}"></label>
          <label>Ghi chú <input name="ghiChu" value="${esc(s0.ghiChu)}"></label>
          <label class="o-chon"><input type="checkbox" name="coKiemTra"${s0.coKiemTra ? ' checked' : ''}> Có kiểm tra</label>
        </section>
        <div class="thanh-cong-cu">
          <button class="nut" data-act="tat-ca-co-mat">${App.icon('check')}Ghi có mặt cho người chưa điểm danh</button>
          ${
            multi()
              ? `<label class="nhan-ngang">Đối tượng <select data-ch="dt">${ui.options(
                  [{ value: '', label: 'Tất cả' }].concat(group.map((s) => ({ value: s.dt, label: App.dt(s.dt).ngan }))),
                  dtFilter
                )}</select></label>`
              : ''
          }
          <label class="nhan-ngang">Đơn vị <select data-ch="unit">${ui.options(
            [{ value: '', label: 'Tất cả' }].concat(unitsInGroup().map((u) => ({ value: u.id, label: u.ten }))),
            unitFilter
          )}</select></label>
          <input type="search" data-ch="search" placeholder="Tìm theo tên" value="${esc(search)}" aria-label="Tìm theo tên">
          <span class="meo">Nhập điểm, nhấn Enter để xuống dòng.</span>
        </div>
        ${
          rows.length
            ? `<div class="khung-bang cuon">
          <table class="bang bang-dd${s0.coKiemTra ? '' : ' khong-kt'}">
            <thead><tr>
              <th class="so w-tt">TT</th><th>Họ và tên</th><th class="w-cb">Cấp bậc</th><th class="w-dv">Đơn vị</th>
              ${multi() ? '<th class="w-dt">Đối tượng</th>' : ''}
              <th class="w-dd">Có mặt</th><th class="w-dd">Vắng</th><th class="w-ld">Lý do vắng</th>
              <th class="kt w-diem">Điểm</th><th class="kt w-xl">Xếp loại</th><th class="w-bu">Ngày học bù, học vét</th>
            </tr></thead>
            <tbody>${rows.map((x, i) => rowHtml(x.s, x.p, i, multi())).join('')}</tbody>
            <tfoot>${footerHtml()}</tfoot>
          </table></div>`
            : ui.empty('Buổi học chưa có người tham gia', 'Bấm "Danh sách tham gia" để chọn các đồng chí học buổi này.', '')
        }`;
      applyFilter();
    }

    function applyFilter() {
      const q = App.norm(search);
      let i = 0;
      App.$$('tbody tr[data-pid]', root).forEach((tr) => {
        const p = M.person(tr.dataset.pid);
        const show =
          (!dtFilter || tr.dataset.dt === dtFilter) &&
          (!unitFilter || p.unitId === unitFilter) &&
          (!q || App.norm(p.hoTen).includes(q));
        tr.hidden = !show;
        if (show) tr.cells[0].textContent = ++i;
      });
    }

    function refreshFooter() {
      const tf = App.$('tfoot', root);
      if (tf) tf.innerHTML = footerHtml();
    }

    function redrawRow(tr, focusSel) {
      const tmp = document.createElement('tbody');
      tmp.innerHTML = rowHtml(sesOf(tr.dataset.sid), M.person(tr.dataset.pid), 0, multi());
      const nr = tmp.firstElementChild;
      nr.cells[0].textContent = tr.cells[0].textContent;
      nr.hidden = tr.hidden;
      tr.replaceWith(nr);
      if (focusSel) {
        const f = App.$(focusSel, nr);
        if (f) f.focus();
      }
    }

    function focusNext(input, dir) {
      const rows = App.$$('tbody tr[data-pid]', root).filter((r) => !r.hidden);
      const i = rows.indexOf(input.closest('tr')) + dir;
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
        const tr = b.closest('tr');
        const { sid: id, pid } = tr.dataset;
        const cur = (M.rec(id, pid) || {}).dd;
        const v = b.dataset.v;
        if (cur === v) M.setRec(id, pid, { dd: null, lyDo: null, bu: null });
        else if (v === 'C') M.setRec(id, pid, { dd: 'C', lyDo: null, bu: null });
        else M.setRec(id, pid, { dd: 'V' });
        redrawRow(tr, `[data-v="${v}"]`);
        refreshFooter();
      } else if (act === 'tat-ca-co-mat') {
        let n = 0;
        App.$$('tbody tr[data-pid]', root).forEach((tr) => {
          if (tr.hidden || (M.rec(tr.dataset.sid, tr.dataset.pid) || {}).dd) return;
          M.setRec(tr.dataset.sid, tr.dataset.pid, { dd: 'C' });
          redrawRow(tr);
          n++;
        });
        refreshFooter();
        ui.toast(n ? `Đã ghi có mặt cho ${n} đồng chí.` : 'Tất cả đã được điểm danh.');
      } else if (act === 'ds') {
        membersDialog(group, () => {
          group = group.filter((s) => M.session(s.id));
          if (!group.length) return App.go(backHref);
          draw();
        });
      } else if (act === 'xoa') {
        const st = M.groupStats(group);
        const ten = group.map((s) => App.dt(s.dt).ten).join(', ');
        const ok = await ui.confirm(
          `Xoá buổi học ngày ${App.fmtDate(group[0].ngay)} (${esc(ten)}) cùng toàn bộ điểm danh và kết quả của ${st.luot} đồng chí? Không thể hoàn tác.`,
          { ok: 'Xoá buổi học', danger: true }
        );
        if (ok) {
          group.forEach((s) => M.deleteSession(s.id));
          ui.toast('Đã xoá buổi học.');
          App.go(backHref);
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
      if (t.dataset.ch === 'unit' || t.dataset.ch === 'dt') {
        if (t.dataset.ch === 'unit') unitFilter = t.value;
        else dtFilter = t.value;
        applyFilter();
        refreshFooter();
        return;
      }
      if (t.closest('[data-ref="info"]')) {
        // Thông tin chung của buổi học áp dụng cho mọi sổ trong nhóm học chung.
        if (t.name === 'ngay') {
          if (!t.value) {
            t.value = group[0].ngay;
            return ui.toast('Ngày học không được để trống.', 'loi');
          }
          group.forEach((s) => (s.ngay = t.value));
          App.$('[data-ref="tieu-de"]', root).textContent = `Buổi học ngày ${App.fmtDate(t.value)}`;
        } else if (t.name === 'coKiemTra') {
          group.forEach((s) => (s.coKiemTra = t.checked));
          const tbl = App.$('table.bang-dd', root);
          if (tbl) tbl.classList.toggle('khong-kt', !t.checked);
          refreshFooter();
        } else {
          group.forEach((s) => (s[t.name] = t.value.trim()));
        }
        App.store.save();
        return;
      }
      const tr = t.closest('tr[data-pid]');
      if (!tr) return;
      const { sid: id, pid } = tr.dataset;
      if (t.name === 'lyDo') M.setRec(id, pid, { lyDo: t.value.trim() });
      else if (t.name === 'bu') {
        M.setRec(id, pid, { bu: t.value });
        t.classList.toggle('chua-co', !t.value);
      } else if (t.name === 'xl') M.setRec(id, pid, { xl: t.value });
      else if (t.name === 'diem') {
        const n = App.parseNum(t.value);
        const sel = App.$('select[name="xl"]', tr);
        if (Number.isNaN(n) || (n != null && (n < 0 || n > 10))) {
          ui.toast('Điểm phải là số từ 0 đến 10, ví dụ 7,5.', 'loi');
          const r = M.rec(id, pid) || {};
          t.value = typeof r.diem === 'number' ? App.fmtNum(r.diem) : '';
          return;
        }
        const r = M.setRec(id, pid, n == null ? { diem: null } : { diem: n, xl: null });
        if (n != null) t.value = App.fmtNum(n);
        sel.value = M.xepLoai(r) || '';
        sel.disabled = n != null;
      }
      refreshFooter();
    });
  }

  // Chọn những ai học buổi này. Người được thêm vào sẽ ghi vào sổ ứng với đối tượng hiện tại của họ.
  // Người bị bỏ khỏi danh sách mất điểm danh của buổi đó; sổ không còn ai thì buổi học của sổ đó bị xoá.
  function membersDialog(group, onDone) {
    const dts = new Set(group.map((s) => s.dt));
    const where = new Map();
    group.forEach((s) => s.members.forEach((pid) => where.set(pid, s)));
    const candidates = M.sortPeople(
      App.store.state.people.filter((p) => where.has(p.id) || (dts.has(p.dt) && p.active !== false))
    );
    const multi = group.length > 1;
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
            .map((p) => {
              const d = App.dt(where.has(p.id) ? where.get(p.id).dt : p.dt);
              return `<label class="o-chon"><input type="checkbox" name="m" data-multi="1" data-u="${uid}" value="${p.id}"${
                where.has(p.id) ? ' checked' : ''
              }> ${esc(p.hoTen)}${multi ? ` <span class="mo">(${esc(d.ngan)})</span>` : ''}</label>`;
            })
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
      title: `Danh sách tham gia buổi ${App.fmtDate(group[0].ngay)}`,
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
            const removed = Array.from(where.keys()).filter((pid) => !chosen.has(pid));
            const withData = removed.filter((pid) => M.rec(where.get(pid).id, pid));
            if (withData.length) {
              const ok = await ui.confirm(
                `${withData.length} đồng chí bị bỏ khỏi danh sách đã có điểm danh hoặc kết quả. Dữ liệu đó sẽ bị xoá. Tiếp tục?`,
                { ok: 'Bỏ và xoá dữ liệu', danger: true }
              );
              if (!ok) return false;
            }
            const recs = App.store.state.records;
            removed.forEach((pid) => {
              const r = recs[where.get(pid).id];
              if (r) delete r[pid];
            });
            group.forEach((s) => {
              const keep = candidates.filter(
                (p) => chosen.has(p.id) && (where.has(p.id) ? where.get(p.id) === s : p.dt === s.dt)
              );
              s.members = keep.map((p) => p.id);
            });
            group.filter((s) => !s.members.length).forEach((s) => M.deleteSession(s.id));
            App.store.save();
            onDone();
          },
        },
      ],
    });
  }
})(window.App);
