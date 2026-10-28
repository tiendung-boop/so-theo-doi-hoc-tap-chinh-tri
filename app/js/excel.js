'use strict';
// Nhập/xuất Excel bằng SheetJS (app/lib/xlsx.full.min.js, bản 0.20.3 tải từ cdn.sheetjs.com).
(function (App) {
  const { esc, M, ui } = App;
  const X = () => {
    if (!window.XLSX) throw new Error('Thiếu thư viện Excel (app/lib/xlsx.full.min.js).');
    return window.XLSX;
  };
  const ex = (App.excel = {});

  function sheet(aoa, widths, merges) {
    const ws = X().utils.aoa_to_sheet(aoa);
    if (widths) ws['!cols'] = widths.map((w) => ({ wch: w }));
    if (merges) ws['!merges'] = merges;
    return ws;
  }
  function save(wb, name) {
    X().writeFile(wb, name, { compression: true });
    ui.toast(`Đã xuất file ${name}.`);
  }
  const stamp = () => App.todayISO();

  // ---------- Nhận diện đối tượng từ chữ trong file Excel ----------
  // Kiểm tra mẫu HSQ-BS trước vì "hạ sĩ quan" cũng chứa chữ "sĩ quan".
  ex.parseDt = (v) => {
    const n = App.norm(v).replace(/[.,;:()-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!n) return null;
    if (/\b(bs2|nam thu hai|nam thu 2|nam 2|n2)\b/.test(n)) return 'BS2';
    if (/\b(bs1|nam thu nhat|nam thu 1|nam 1|n1)\b/.test(n)) return 'BS1';
    if (/\b(ha si quan|hsq|binh si|bs)\b/.test(n)) return null;
    if (/\b(si quan|sq)\b/.test(n)) return 'SQ';
    if (/\b(quan nhan|qncn|qn)\b/.test(n)) return 'QN';
    return null;
  };

  const COLS = {
    hoTen: ['ho va ten', 'ho ten', 'ho va ten quan nhan'],
    capBac: ['cap bac'],
    chucVu: ['chuc vu'],
    donVi: ['don vi'],
    doiTuong: ['doi tuong'],
    ghiChu: ['ghi chu'],
  };

  function findHeader(rows) {
    for (let r = 0; r < Math.min(rows.length, 20); r++) {
      const cells = rows[r].map((c) => App.norm(c));
      const map = {};
      Object.entries(COLS).forEach(([k, names]) => {
        const i = cells.findIndex((c) => names.includes(c));
        if (i >= 0) map[k] = i;
      });
      if (map.hoTen == null) {
        // Một số danh sách tách "Họ" (hoặc "Họ đệm") và "Tên" thành hai cột.
        const ho = cells.findIndex((c) => c === 'ho' || c === 'ho dem' || c === 'ho va dem');
        const ten = cells.findIndex((c) => c === 'ten');
        if (ho >= 0 && ten >= 0) {
          map.hoTen = ho;
          map.tenRieng = ten;
        }
      }
      if (map.hoTen != null) return { row: r, map };
    }
    return null;
  }

  ex.parsePeopleRows = (rows) => {
    const h = findHeader(rows);
    if (!h) throw new Error('Không tìm thấy dòng tiêu đề có cột "Họ và tên" trong 20 dòng đầu của sheet.');
    const { map } = h;
    const data = rows.slice(h.row + 1);
    // Tiêu đề "Họ và tên" gộp ô trên hai cột (họ đệm | tên): cột kế bên không có tiêu đề và chứa một từ.
    if (map.tenRieng == null && !String(rows[h.row][map.hoTen + 1] || '').trim()) {
      const vals = data.map((r) => String(r[map.hoTen + 1] || '').trim()).filter(Boolean);
      if (vals.length && vals.filter((v) => !/\s/.test(v)).length / vals.length >= 0.6) map.tenRieng = map.hoTen + 1;
    }
    const get = (r, k) => (map[k] == null ? '' : String(r[map[k]] == null ? '' : r[map[k]]).replace(/\s+/g, ' ').trim());
    const out = [];
    data.forEach((r) => {
      let hoTen = get(r, 'hoTen');
      if (map.tenRieng != null) hoTen = (hoTen + ' ' + String(r[map.tenRieng] || '').trim()).trim();
      if (!hoTen || /^(tong|cong|danh sach)/.test(App.norm(hoTen)) || /^\d+$/.test(hoTen)) return;
      out.push({
        hoTen,
        capBac: get(r, 'capBac'),
        chucVu: get(r, 'chucVu'),
        donVi: get(r, 'donVi'),
        dtRaw: get(r, 'doiTuong'),
        dt: ex.parseDt(get(r, 'doiTuong')),
        ghiChu: get(r, 'ghiChu'),
      });
    });
    return { rows: out, found: Object.keys(map).filter((k) => k !== 'tenRieng') };
  };

  ex.downloadTemplate = () => {
    const wb = X().utils.book_new();
    X().utils.book_append_sheet(
      wb,
      sheet(
        [
          ['TT', 'Họ và tên', 'Cấp bậc', 'Chức vụ', 'Đơn vị', 'Đối tượng', 'Ghi chú'],
          [1, 'Nguyễn Văn A', 'Binh nhì', 'Chiến sĩ', 'Đại đội 1', 'HSQ, BS năm thứ nhất', ''],
          [2, 'Trần Văn B', 'Hạ sĩ', 'Tiểu đội trưởng', 'Đại đội 1', 'HSQ, BS năm thứ hai', ''],
          [3, 'Lê Văn C', 'Trung úy', 'Trung đội trưởng', 'Đại đội 1', 'Sĩ quan', ''],
        ],
        [5, 28, 14, 20, 18, 24, 20]
      ),
      'Danh sách'
    );
    X().utils.book_append_sheet(
      wb,
      sheet(
        [
          ['Hướng dẫn điền danh sách'],
          ['Giữ nguyên dòng tiêu đề. Mỗi dòng một đồng chí. Xoá 3 dòng ví dụ trước khi nhập.'],
          ['Cột "Đơn vị" ghi đúng tên đơn vị như trong phần Cài đặt. Đơn vị chưa có sẽ được tạo mới khi nhập.'],
          ['Cột "Đối tượng" ghi một trong bốn giá trị:'],
          ['', 'Sĩ quan'],
          ['', 'Quân nhân'],
          ['', 'HSQ, BS năm thứ nhất'],
          ['', 'HSQ, BS năm thứ hai'],
          ['Có thể để trống cột "Đối tượng" hoặc "Đơn vị" rồi chọn giá trị chung khi nhập.'],
        ],
        [90, 30]
      ),
      'Hướng dẫn'
    );
    save(wb, 'mau-danh-sach-quan-nhan.xlsx');
  };

  ex.importPeopleDialog = async (onDone) => {
    const file = await ui.pickFile('.xlsx,.xls,.csv');
    if (!file) return;
    let parsed, sheetName;
    try {
      const wb = X().read(await ui.readBuffer(file), { type: 'array' });
      sheetName = wb.SheetNames[0];
      const rows = X().utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: false, defval: '' });
      parsed = ex.parsePeopleRows(rows);
    } catch (e) {
      return ui.toast(`Không đọc được file ${file.name}: ${e.message}`, 'loi');
    }
    if (!parsed.rows.length) return ui.toast(`Sheet "${sheetName}" không có dòng nào ghi họ tên.`, 'loi');

    const state = App.store.state;
    const existing = new Set(state.people.map((p) => App.norm(p.hoTen) + '|' + p.unitId));
    const newUnits = Array.from(new Set(parsed.rows.map((r) => r.donVi).filter((d) => d && !M.findUnitByName(d))));
    const noDt = parsed.rows.filter((r) => !r.dt).length;
    const noUnit = parsed.rows.filter((r) => !r.donVi).length;
    const tenCot = { hoTen: 'Họ và tên', capBac: 'Cấp bậc', chucVu: 'Chức vụ', donVi: 'Đơn vị', doiTuong: 'Đối tượng', ghiChu: 'Ghi chú' };
    const preview = parsed.rows.slice(0, 8);

    ui.modal({
      title: `Nhập danh sách từ ${file.name}`,
      wide: true,
      body: `
        <p>Đọc được <b>${parsed.rows.length}</b> đồng chí từ sheet "${esc(sheetName)}". Các cột nhận ra: ${parsed.found.map((k) => tenCot[k]).join(', ')}.</p>
        ${newUnits.length ? `<p>Sẽ tạo thêm ${newUnits.length} đơn vị mới: ${newUnits.map(esc).join(', ')}.</p>` : ''}
        <div class="luoi-form">
          ${noDt ? `<label>Đối tượng cho ${noDt === parsed.rows.length ? 'tất cả' : `${noDt} dòng không ghi rõ`}
            <select name="dtMacDinh">${ui.dtOptions('BS1')}</select></label>` : ''}
          ${noUnit ? `<label>Đơn vị cho ${noUnit === parsed.rows.length ? 'tất cả' : `${noUnit} dòng để trống`}
            <select name="dvMacDinh">${ui.unitOptions(state.units[0] && state.units[0].id)}</select></label>` : ''}
          <label class="o-chon ca-dong"><input type="checkbox" name="boQuaTrung" checked> Bỏ qua người trùng họ tên và đơn vị với danh sách hiện có</label>
        </div>
        <div class="khung-bang"><table class="bang">
          <thead><tr><th>Họ và tên</th><th>Cấp bậc</th><th>Chức vụ</th><th>Đơn vị</th><th>Đối tượng</th></tr></thead>
          <tbody>${preview
            .map(
              (r) => `<tr><td>${esc(r.hoTen)}</td><td>${esc(r.capBac)}</td><td>${esc(r.chucVu)}</td>
              <td>${r.donVi ? esc(r.donVi) : '<span class="mo">theo lựa chọn chung</span>'}</td>
              <td>${r.dt ? esc(App.dt(r.dt).ten) : `<span class="mo">${r.dtRaw ? `"${esc(r.dtRaw)}" chưa rõ, ` : ''}theo lựa chọn chung</span>`}</td></tr>`
            )
            .join('')}</tbody></table></div>
        ${parsed.rows.length > preview.length ? `<p class="mo">Và ${parsed.rows.length - preview.length} dòng khác.</p>` : ''}`,
      actions: [
        { label: 'Huỷ' },
        {
          label: `Nhập ${parsed.rows.length} đồng chí`,
          kind: 'chinh',
          submit: true,
          onClick: (dlg) => {
            const f = ui.formData(dlg);
            let thuTu = M.nextThuTu();
            let added = 0;
            let skipped = 0;
            parsed.rows.forEach((r) => {
              const unitId = r.donVi ? M.ensureUnit(r.donVi).id : f.dvMacDinh;
              const k = App.norm(r.hoTen) + '|' + unitId;
              if (f.boQuaTrung && existing.has(k)) return skipped++;
              existing.add(k);
              state.people.push({
                id: App.uid(), hoTen: r.hoTen, capBac: r.capBac, chucVu: r.chucVu, unitId,
                dt: r.dt || f.dtMacDinh, ghiChu: r.ghiChu, active: true, thuTu: thuTu++,
              });
              added++;
            });
            App.store.save();
            ui.toast(`Đã nhập ${added} đồng chí${skipped ? `, bỏ qua ${skipped} người trùng` : ''}.`);
            onDone();
          },
        },
      ],
    });
  };

  ex.exportPeople = (list) => {
    const wb = X().utils.book_new();
    const aoa = [['TT', 'Họ và tên', 'Cấp bậc', 'Chức vụ', 'Đơn vị', 'Đối tượng', 'Trạng thái', 'Ghi chú']].concat(
      list.map((p, i) => [
        i + 1, p.hoTen, p.capBac, p.chucVu, M.unitName(p.unitId), App.dt(p.dt).ten,
        p.active === false ? 'Ngừng theo dõi' : 'Đang theo dõi', p.ghiChu,
      ])
    );
    X().utils.book_append_sheet(wb, sheet(aoa, [5, 28, 14, 20, 18, 24, 16, 24]), 'Danh sách');
    save(wb, `danh-sach-quan-nhan-${stamp()}.xlsx`);
  };

  ex.exportAbsences = (list) => {
    const wb = X().utils.book_new();
    const aoa = [['TT', 'Họ và tên', 'Cấp bậc', 'Đơn vị', 'Đối tượng', 'Ngày học', 'Nội dung', 'Lý do vắng', 'Ngày học bù', 'Điểm', 'Xếp loại']].concat(
      list.map((x, i) => {
        const xl = x.s.coKiemTra ? M.xepLoai(x.r) : null;
        return [
          i + 1, x.p.hoTen, x.p.capBac, M.unitName(x.p.unitId), App.dt(x.s.dt).ten, App.fmtDate(x.s.ngay), x.s.noiDung,
          x.r.lyDo || '', App.fmtDate(x.r.bu), typeof x.r.diem === 'number' ? x.r.diem : '', xl ? App.xl(xl).ten : '',
        ];
      })
    );
    X().utils.book_append_sheet(wb, sheet(aoa, [5, 26, 12, 16, 22, 12, 36, 14, 12, 7, 11]), 'Học bù');
    save(wb, `hoc-bu-hoc-vet-${stamp()}.xlsx`);
  };

  // Sổ theo mẫu: một sheet, các buổi học nối tiếp nhau theo chiều ngang, cuối có dòng Tổng và Học bù.
  ex.exportSo = (dt, o) => {
    const m = App.store.state.meta;
    const sessions = M.sessionsOf(dt.ma, o.year);
    const people = App.soPeople(dt, o);
    const showUnit = !o.unitId;
    const lead = showUnit ? 3 : 2;
    const ncol = lead + sessions.length * 4;
    const merges = [];
    const mg = (r1, c1, r2, c2) => merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });

    const aoa = [
      [m.trungDoan.toLocaleUpperCase('vi')],
      [m.tieuDoan.toLocaleUpperCase('vi') + (o.unitId ? ' - ' + M.unitName(o.unitId).toLocaleUpperCase('vi') : '')],
      [`SỔ ĐĂNG KÝ THEO DÕI KẾT QUẢ HỌC TẬP CHÍNH TRỊ CỦA ${dt.bia} - NĂM ${o.year}`],
      [],
    ];
    mg(2, 0, 2, Math.max(ncol - 1, 6));
    const h1 = ['TT', 'Họ và tên'].concat(showUnit ? ['Đơn vị'] : []);
    const h2 = new Array(lead).fill('');
    const h3 = new Array(lead).fill('');
    for (let c = 0; c < lead; c++) mg(4, c, 6, c);
    sessions.forEach((s, k) => {
      const c = lead + k * 4;
      h1.push(App.soDateLabel(s, o.year), '', '', 'Ghi chú (Ngày, tháng, năm học bù, học vét)');
      h2.push(s.noiDung || '', '', '', '');
      h3.push('Có mặt', 'Vắng', 'Kiểm tra', '');
      mg(4, c, 4, c + 2);
      mg(5, c, 5, c + 2);
      mg(4, c + 3, 6, c + 3);
    });
    aoa.push(h1, h2, h3);

    const sets = sessions.map((s) => new Set(s.members));
    people.forEach((p, i) => {
      const row = [i + 1, p.hoTen].concat(showUnit ? [M.unitName(p.unitId)] : []);
      sessions.forEach((s, k) => row.push(...App.soCells(s, sets[k], p)));
      aoa.push(row);
    });

    const tong = ['Tổng:', ''].concat(showUnit ? [''] : []);
    const bu = ['Học bù, học vét', ''].concat(showUnit ? [''] : []);
    const rT = aoa.length;
    mg(rT, 0, rT, lead - 1);
    mg(rT + 1, 0, rT + 1, lead - 1);
    sessions.forEach((s, k) => {
      const st = M.sessionStats(s, o.unitId);
      const kt = s.coKiemTra
        ? App.XL.map((x) => `${x.ky}: ${st[x.ma]}/${st.kt} = ${App.fmtPct(App.pct(st[x.ma], st.kt))}`).join('\n')
        : '';
      tong.push(`${st.coMat}/${st.luot} đ/c`, `${st.vang}/${st.luot} đ/c`, kt, '');
      bu.push(`Đã học: ${st.daBu}/${st.vang} đ/c; Chưa học: ${st.chuaBu}/${st.vang} đ/c`, '', '', '');
      mg(rT + 1, lead + k * 4, rT + 1, lead + k * 4 + 3);
    });
    aoa.push(tong, bu);

    const widths = [5, 26].concat(showUnit ? [16] : []);
    sessions.forEach(() => widths.push(8, 10, 16, 18));
    const wb = X().utils.book_new();
    X().utils.book_append_sheet(wb, sheet(aoa, widths, merges), 'Sổ theo dõi');
    save(wb, `so-theo-doi-${dt.ma.toLowerCase()}-${o.year}${o.unitId ? '-' + App.norm(M.unitName(o.unitId)).replace(/\s+/g, '-') : ''}.xlsx`);
  };

  ex.exportReport = (data, watch) => {
    if (!data || !data.total.buoi) return ui.toast('Kỳ này chưa có số liệu để xuất.', 'loi');
    const state = App.store.state;
    const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : '');
    const head = (first) => [
      first, 'Số buổi', 'Lượt quân số', 'Có mặt', 'Tỷ lệ có mặt (%)', 'Vắng', 'Đã học bù', 'Chưa học bù', 'Lượt kiểm tra',
      'Giỏi', 'Giỏi (%)', 'Khá', 'Khá (%)', 'Đạt', 'Đạt (%)', 'Không đạt', 'Không đạt (%)', 'Khá, giỏi (%)',
    ];
    const row = (label, a) => [
      label, a.buoi, a.luot, a.coMat, pct(a.coMat, a.luot), a.vang, a.daBu, a.chuaBu, a.kt,
      a.G, pct(a.G, a.kt), a.K, pct(a.K, a.kt), a.D, pct(a.D, a.kt), a.KD, pct(a.KD, a.kt), pct(a.G + a.K, a.kt),
    ];
    const scope = data.unitId ? M.unitName(data.unitId) : state.meta.tieuDoan;
    const title = [`Báo cáo kết quả học tập chính trị. ${scope}, ${data.range.label}.`];
    const widths = [24].concat(new Array(17).fill(10));
    const wb = X().utils.book_new();

    const s1 = [title, [], head('Đối tượng')]
      .concat(App.DT.filter((d) => data.byDt[d.ma].buoi).map((d) => row(d.ten, data.byDt[d.ma])))
      .concat([row('Tổng cộng', data.total)]);
    X().utils.book_append_sheet(wb, sheet(s1, widths), 'Theo đối tượng');

    const s2 = [title, [], head('Đơn vị')].concat(
      state.units.filter((u) => data.byUnit.get(u.id) && data.byUnit.get(u.id).luot).map((u) => row(u.ten, data.byUnit.get(u.id)))
    );
    X().utils.book_append_sheet(wb, sheet(s2, widths), 'Theo đơn vị');

    const s3 = [title, [], ['Tháng', 'Đối tượng'].concat(head('').slice(1))];
    data.months.forEach((mk) =>
      App.DT.forEach((d) => {
        const a = data.byMonth[mk][d.ma];
        if (a) s3.push([`${mk.slice(5)}/${mk.slice(0, 4)}`].concat(row(d.ten, a)));
      })
    );
    X().utils.book_append_sheet(wb, sheet(s3, [10].concat(widths)), 'Theo tháng');

    const personHead = ['Họ và tên', 'Cấp bậc', 'Đơn vị', 'Đối tượng', 'Số buổi', 'Có mặt', 'Vắng', 'Chưa học bù', 'Lượt kiểm tra', 'Giỏi', 'Khá', 'Đạt', 'Không đạt', 'Điểm trung bình'];
    const personRow = (w) => [
      w.p.hoTen, w.p.capBac, M.unitName(w.p.unitId), App.dt(w.p.dt).ten, w.agg.buoi, w.agg.coMat, w.agg.vang, w.agg.chuaBu,
      w.agg.kt, w.agg.G, w.agg.K, w.agg.D, w.agg.KD, w.diemN ? Math.round((w.diemSum / w.diemN) * 100) / 100 : '',
    ];
    const pw = [26, 12, 16, 22].concat(new Array(10).fill(10));
    X().utils.book_append_sheet(wb, sheet([title, [], personHead].concat(watch.map(personRow)), pw), 'Cần chú ý');
    const everyone = M.sortPeople(Array.from(data.perPerson.values()).map((w) => w.p)).map((p) => data.perPerson.get(p.id));
    X().utils.book_append_sheet(wb, sheet([title, [], personHead].concat(everyone.map(personRow)), pw), 'Từng quân nhân');

    save(wb, `bao-cao-hoc-tap-chinh-tri-${data.range.from}-den-${data.range.to}.xlsx`);
  };
})(window.App);
