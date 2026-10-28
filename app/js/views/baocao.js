'use strict';
// Báo cáo thống kê theo kỳ (năm, 6 tháng, quý, tháng): theo đối tượng, theo đơn vị, theo tháng,
// và danh sách quân nhân cần chú ý. Biểu đồ vẽ bằng SVG thuần để chạy offline không cần thư viện.
(function (App) {
  const { esc, M, ui } = App;

  // Màu đã kiểm tra bằng validate_palette.js (skill dataviz): đạt CVD và độ phân biệt cặp liền kề.
  // Các màu có độ tương phản dưới 3:1 (K, Đ, BS1, BS2) luôn đi kèm nhãn số và bảng số liệu.
  App.MAU_XL = { G: '#1c5cab', K: '#5598e7', D: '#eda100', KD: '#e34948' };
  const CHU_XL = { G: '#ffffff', K: '#14122e', D: '#14122e', KD: '#ffffff' };
  const MAU_DT = { SQ: '#2a78d6', QN: '#eb6834', BS1: '#1baf7a', BS2: '#eda100' };

  const KY = [{ value: 'nam', label: 'Cả năm' }, { value: 'h1', label: '6 tháng đầu năm' }, { value: 'h2', label: '6 tháng cuối năm' }]
    .concat([1, 2, 3, 4].map((q) => ({ value: 'q' + q, label: 'Quý ' + ['I', 'II', 'III', 'IV'][q - 1] })))
    .concat(Array.from({ length: 12 }, (_, i) => ({ value: 'm' + (i + 1), label: 'Tháng ' + (i + 1) })))
    .concat([{ value: 'tuy-chon', label: 'Tuỳ chọn ngày' }]);

  function kyRange(vs) {
    const y = vs.year;
    const last = (m) => new Date(y, m, 0).getDate();
    const r = (m1, m2) => ({ from: `${y}-${App.pad2(m1)}-01`, to: `${y}-${App.pad2(m2)}-${last(m2)}` });
    let out;
    if (vs.ky === 'nam') out = r(1, 12);
    else if (vs.ky === 'h1') out = r(1, 6);
    else if (vs.ky === 'h2') out = r(7, 12);
    else if (vs.ky[0] === 'q') {
      const q = Number(vs.ky.slice(1));
      out = r(q * 3 - 2, q * 3);
    } else if (vs.ky[0] === 'm') {
      const m = Number(vs.ky.slice(1));
      out = r(m, m);
    } else out = { from: vs.from || `${y}-01-01`, to: vs.to || `${y}-12-31` };
    const kyLabel = KY.find((k) => k.value === vs.ky).label;
    out.label = vs.ky === 'tuy-chon' ? `Từ ${App.fmtDate(out.from)} đến ${App.fmtDate(out.to)}` : `${kyLabel} ${y}`;
    return out;
  }

  App.reportData = function (range, unitId) {
    const state = App.store.state;
    const sessions = state.sessions
      .filter((s) => s.ngay >= range.from && s.ngay <= range.to)
      .sort((a, b) => (a.ngay < b.ngay ? -1 : 1));
    const total = M.emptyAgg();
    const byDt = {};
    App.DT.forEach((d) => (byDt[d.ma] = M.emptyAgg()));
    const byUnit = new Map(state.units.map((u) => [u.id, M.emptyAgg()]));
    const months = [];
    const byMonth = {};
    const perPerson = new Map();

    sessions.forEach((s) => {
      const members = M.members(s, unitId);
      if (!members.length) return;
      const mk = s.ngay.slice(0, 7);
      if (!byMonth[mk]) {
        byMonth[mk] = {};
        months.push(mk);
      }
      if (!byMonth[mk][s.dt]) byMonth[mk][s.dt] = M.emptyAgg();
      total.buoi++;
      byDt[s.dt].buoi++;
      byMonth[mk][s.dt].buoi++;
      const unitsHere = new Set();
      members.forEach((p) => {
        const r = M.rec(s.id, p.id);
        M.addToAgg(total, s, r);
        M.addToAgg(byDt[s.dt], s, r);
        M.addToAgg(byMonth[mk][s.dt], s, r);
        if (!byUnit.has(p.unitId)) byUnit.set(p.unitId, M.emptyAgg());
        M.addToAgg(byUnit.get(p.unitId), s, r);
        unitsHere.add(p.unitId);
        if (!perPerson.has(p.id)) perPerson.set(p.id, { p, agg: M.emptyAgg(), diemSum: 0, diemN: 0 });
        const pp = perPerson.get(p.id);
        pp.agg.buoi++;
        M.addToAgg(pp.agg, s, r);
        if (s.coKiemTra && r && typeof r.diem === 'number') {
          pp.diemSum += r.diem;
          pp.diemN++;
        }
      });
      unitsHere.forEach((uid) => byUnit.get(uid).buoi++);
    });
    months.sort();
    return { range, unitId, sessions, total, byDt, byUnit, months, byMonth, perPerson };
  };

  const pctCell = (a, b) => `${a}<span class="mo pct">${App.fmtPct(App.pct(a, b))}</span>`;

  function aggRow(label, a, cls) {
    return `<tr${cls ? ` class="${cls}"` : ''}>
      <td class="ten">${label}</td><td class="so">${a.buoi}</td><td class="so">${a.luot}</td>
      <td class="so">${pctCell(a.coMat, a.luot)}</td><td class="so">${a.vang}</td>
      <td class="so">${a.daBu}</td><td class="so">${a.chuaBu ? `<span class="canh">${a.chuaBu}</span>` : 0}</td>
      <td class="so">${a.kt}</td>
      ${App.XL.map((x) => `<td class="so">${pctCell(a[x.ma], a.kt)}</td>`).join('')}
      <td class="so"><b>${App.fmtPct(App.pct(a.G + a.K, a.kt))}</b></td>
    </tr>`;
  }

  function aggHead(first) {
    return `<thead><tr>
      <th>${first}</th><th class="so">Số buổi</th><th class="so">Lượt quân số</th><th class="so">Có mặt</th><th class="so">Vắng</th>
      <th class="so">Đã học bù</th><th class="so">Chưa học bù</th><th class="so">Lượt kiểm tra</th>
      ${App.XL.map((x) => `<th class="so">${x.ten}</th>`).join('')}<th class="so">Khá, giỏi</th>
    </tr></thead>`;
  }

  // Thanh 100% xếp chồng: mỗi đối tượng một thanh, các đoạn Giỏi/Khá/Đạt/Không đạt.
  function stackChart(rows) {
    const W = 720, LW = 170, BH = 24, GAP = 16, R = 4;
    const H = rows.length * (BH + GAP);
    const x0 = LW, x1 = W - 8, span = x1 - x0;
    const bars = rows
      .map((row, i) => {
        const y = i * (BH + GAP);
        const a = row.agg;
        let x = x0;
        const segs = App.XL.filter((l) => a[l.ma] > 0).map((l) => {
          const w = (a[l.ma] / a.kt) * span;
          const seg = { l, x, w, n: a[l.ma] };
          x += w;
          return seg;
        });
        const parts = segs
          .map((sg, k) => {
            // Khe 2 px màu nền giữa các đoạn; bo góc chỉ ở hai đầu thanh.
            const w = Math.max(1, sg.w - (k < segs.length - 1 ? 2 : 0));
            const first = k === 0, last = k === segs.length - 1;
            const p = App.pct(sg.n, a.kt);
            const tip = `${row.label}. ${sg.l.ten}: ${sg.n}/${a.kt} (${App.fmtPct(p)})`;
            const path = roundedBar(sg.x, y, w, BH, first ? R : 0, last ? R : 0);
            const label = w >= 44
              ? `<text x="${sg.x + w / 2}" y="${y + BH / 2 + 4}" text-anchor="middle" fill="${CHU_XL[sg.l.ma]}" class="bd-nhan-trong">${App.fmtPct(p)}</text>`
              : '';
            return `<g class="bd-doan"><title>${esc(tip)}</title><path d="${path}" fill="${App.MAU_XL[sg.l.ma]}"/>${label}</g>`;
          })
          .join('');
        return `<text x="${LW - 12}" y="${y + BH / 2 + 4}" text-anchor="end" class="bd-nhan">${esc(row.label)}</text>${parts}`;
      })
      .join('');
    return `<div class="chu-giai">${App.XL.map((l) => `<span><i style="background:${App.MAU_XL[l.ma]}"></i>${l.ten}</span>`).join('')}</div>
      <svg class="bieu-do" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tỷ lệ xếp loại kiểm tra theo đối tượng">${bars}</svg>`;
  }

  function roundedBar(x, y, w, h, rl, rr) {
    rl = Math.min(rl, w / 2);
    rr = Math.min(rr, w / 2);
    return `M${x + rl},${y} H${x + w - rr} ${rr ? `Q${x + w},${y} ${x + w},${y + rr}` : ''} V${y + h - rr} ${
      rr ? `Q${x + w},${y + h} ${x + w - rr},${y + h}` : ''
    } H${x + rl} ${rl ? `Q${x},${y + h} ${x},${y + h - rl}` : ''} V${y + rl} ${rl ? `Q${x},${y} ${x + rl},${y}` : ''} Z`;
  }

  // Đường tỷ lệ có mặt theo tháng, mỗi đối tượng một đường; di chuột để xem số liệu từng tháng.
  function lineChart(data) {
    const months = data.months;
    const series = App.DT.map((d) => ({
      d,
      vals: months.map((m) => {
        const a = data.byMonth[m][d.ma];
        return a && a.luot ? (a.coMat / a.luot) * 100 : null;
      }),
    })).filter((s) => s.vals.some((v) => v != null));
    if (!series.length || months.length < 2) return '';
    const W = 720, H = 260, PL = 44, PR = 130, PT = 12, PB = 30;
    const all = series.flatMap((s) => s.vals.filter((v) => v != null));
    const yMin = Math.max(0, Math.floor((Math.min(...all) - 5) / 10) * 10);
    const step = 100 - yMin > 50 ? 20 : 10;
    const xs = (i) => PL + (months.length === 1 ? 0 : (i / (months.length - 1)) * (W - PL - PR));
    const ys = (v) => PT + ((100 - v) / (100 - yMin)) * (H - PT - PB);
    const sameYear = months.every((m) => m.slice(0, 4) === months[0].slice(0, 4));
    const mLabel = (m) => (sameYear ? `T${Number(m.slice(5))}` : `${m.slice(5)}/${m.slice(2, 4)}`);

    let grid = '';
    for (let v = yMin; v <= 100; v += step) {
      grid += `<line x1="${PL}" x2="${W - PR}" y1="${ys(v)}" y2="${ys(v)}" class="${v === yMin ? 'bd-truc' : 'bd-luoi'}"/>
        <text x="${PL - 8}" y="${ys(v) + 4}" text-anchor="end" class="bd-so">${v}%</text>`;
    }
    const xl = months.map((m, i) => `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle" class="bd-so">${mLabel(m)}</text>`).join('');
    const lines = series
      .map((s) => {
        let d = '';
        let pen = false;
        s.vals.forEach((v, i) => {
          if (v == null) return (pen = false);
          d += `${pen ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(v).toFixed(1)} `;
          pen = true;
        });
        const dots = s.vals
          .map((v, i) => (v == null ? '' : `<circle cx="${xs(i)}" cy="${ys(v)}" r="4" fill="${MAU_DT[s.d.ma]}" class="bd-diem"/>`))
          .join('');
        return `<path d="${d}" fill="none" stroke="${MAU_DT[s.d.ma]}" stroke-width="2" stroke-linejoin="round"/>${dots}`;
      })
      .join('');
    // Nhãn cuối đường: đẩy dọc để không đè nhau (cách nhau tối thiểu 14 px).
    const ends = series
      .map((s) => {
        let i = s.vals.length - 1;
        while (s.vals[i] == null) i--;
        return { s, y: ys(s.vals[i]) };
      })
      .sort((a, b) => a.y - b.y);
    for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 14) ends[k].y = ends[k - 1].y + 14;
    const endLabels = ends
      .map((e) => `<text x="${W - PR + 10}" y="${e.y + 4}" class="bd-nhan">${esc(e.s.d.ngan)}</text>`)
      .join('');
    const cols = months
      .map((m, i) => {
        const w = (W - PL - PR) / Math.max(1, months.length - 1);
        return `<rect x="${xs(i) - w / 2}" y="${PT}" width="${w}" height="${H - PT - PB}" fill="transparent" data-col="${i}"/>`;
      })
      .join('');
    const tipData = months.map((m, i) => ({
      title: sameYear ? `Tháng ${Number(m.slice(5))}/${m.slice(0, 4)}` : `Tháng ${m.slice(5)}/${m.slice(0, 4)}`,
      rows: series.map((s) => ({ ten: s.d.ngan, mau: MAU_DT[s.d.ma], v: s.vals[i] })),
      x: xs(i),
    }));
    return `<div class="chu-giai">${series.map((s) => `<span><i style="background:${MAU_DT[s.d.ma]}"></i>${esc(s.d.ten)}</span>`).join('')}</div>
      <div class="bd-khung" data-tip='${esc(JSON.stringify(tipData))}'>
        <svg class="bieu-do" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tỷ lệ có mặt theo tháng">
          ${grid}${xl}<line class="bd-tro" x1="0" x2="0" y1="${PT}" y2="${H - PB}" visibility="hidden"/>${lines}${endLabels}${cols}
        </svg>
        <div class="bd-goi-y" hidden></div>
      </div>`;
  }

  function bindLineHover(root) {
    const box = App.$('.bd-khung', root);
    if (!box) return;
    const data = JSON.parse(box.dataset.tip);
    const svg = App.$('svg', box);
    const cross = App.$('.bd-tro', box);
    const tip = App.$('.bd-goi-y', box);
    box.addEventListener('mousemove', (e) => {
      const col = e.target.closest('[data-col]');
      if (!col) return;
      const d = data[Number(col.dataset.col)];
      cross.setAttribute('x1', d.x);
      cross.setAttribute('x2', d.x);
      cross.setAttribute('visibility', 'visible');
      tip.innerHTML = `<b>${esc(d.title)}</b>${d.rows
        .map((r) => `<div><i style="background:${r.mau}"></i>${esc(r.ten)}<span>${r.v == null ? 'không học' : App.fmtPct(r.v)}</span></div>`)
        .join('')}`;
      tip.hidden = false;
      const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
      const left = d.x * scale;
      const bw = box.getBoundingClientRect().width;
      tip.style.left = (left + 16 + 200 > bw ? left - 216 : left + 16) + 'px';
    });
    box.addEventListener('mouseleave', () => {
      cross.setAttribute('visibility', 'hidden');
      tip.hidden = true;
    });
  }

  App.views['bao-cao'] = function (root) {
    const state = App.store.state;
    const vs = (App.viewState.bc = App.viewState.bc || { ky: 'nam', year: state.meta.nam, from: '', to: '', unitId: '' });

    root.innerHTML = `
      <header class="dau-trang">
        <div>
          <h1>Báo cáo kết quả học tập chính trị</h1>
          <p class="phu" data-ref="phu"></p>
        </div>
        <div class="hang-nut khong-in">
          <button class="nut" data-act="in">In báo cáo</button>
          <button class="nut chinh" data-act="excel">Xuất Excel</button>
        </div>
      </header>
      <div class="thanh-cong-cu khong-in">
        <label class="nhan-ngang">Kỳ <select data-ch="ky">${ui.options(KY, vs.ky)}</select></label>
        <label class="nhan-ngang">Năm <select data-ch="year">${ui.options(M.years().map((y) => ({ value: y, label: y })), vs.year)}</select></label>
        <span data-ref="tuy-chon" class="hang-nut"${vs.ky === 'tuy-chon' ? '' : ' hidden'}>
          <label class="nhan-ngang">Từ <input type="date" data-ch="from" value="${vs.from}"></label>
          <label class="nhan-ngang">Đến <input type="date" data-ch="to" value="${vs.to}"></label>
        </span>
        <label class="nhan-ngang">Đơn vị <select data-ch="unitId">${ui.unitOptions(vs.unitId, 'Cả tiểu đoàn')}</select></label>
      </div>
      <div data-ref="noi-dung"></div>`;

    let data;
    function draw() {
      const range = kyRange(vs);
      data = App.reportData(range, vs.unitId);
      const scope = vs.unitId ? M.unitName(vs.unitId) : state.meta.tieuDoan;
      App.$('[data-ref="phu"]', root).textContent = `${scope}, ${range.label.charAt(0).toLowerCase() + range.label.slice(1)}. ${data.total.buoi} buổi học.`;
      const box = App.$('[data-ref="noi-dung"]', root);
      if (!data.total.buoi) {
        box.innerHTML = ui.empty('Chưa có buổi học nào trong kỳ này', 'Chọn kỳ báo cáo khác, hoặc vào các sổ để thêm buổi học.', '');
        return;
      }
      const dtRows = App.DT.filter((d) => data.byDt[d.ma].buoi);
      const unitRows = state.units.filter((u) => data.byUnit.get(u.id) && data.byUnit.get(u.id).luot);
      const stackRows = dtRows
        .filter((d) => data.byDt[d.ma].kt)
        .map((d) => ({ label: d.ten, agg: data.byDt[d.ma] }))
        .concat(data.total.kt ? [{ label: vs.unitId ? 'Cả đơn vị' : 'Cả tiểu đoàn', agg: data.total }] : []);
      const watch = watchList(data);
      const line = lineChart(data);

      box.innerHTML = `
        <section class="muc">
          <h2>Theo đối tượng</h2>
          <div class="khung-bang"><table class="bang bang-bc">${aggHead('Đối tượng')}<tbody>
            ${dtRows.map((d) => aggRow(esc(d.ten), data.byDt[d.ma])).join('')}
            ${aggRow(vs.unitId ? 'Cả đơn vị' : 'Cả tiểu đoàn', data.total, 'dong-tong')}
          </tbody></table></div>
        </section>
        ${stackRows.length ? `<section class="muc"><h2>Tỷ lệ xếp loại kiểm tra</h2><div class="khung-bd">${stackChart(stackRows)}</div></section>` : ''}
        ${line ? `<section class="muc"><h2>Tỷ lệ có mặt theo tháng</h2><div class="khung-bd">${line}</div></section>` : ''}
        ${!vs.unitId ? `<section class="muc">
          <h2>Theo đơn vị</h2>
          <div class="khung-bang"><table class="bang bang-bc">${aggHead('Đơn vị')}<tbody>
            ${unitRows.map((u) => aggRow(esc(u.ten), data.byUnit.get(u.id))).join('')}
          </tbody></table></div>
        </section>` : ''}
        <section class="muc">
          <h2>Quân nhân cần chú ý</h2>
          <p class="phu">Những đồng chí còn buổi vắng chưa học bù, vắng từ 2 buổi trở lên, hoặc có kết quả Không đạt.</p>
          ${watch.length ? `<div class="khung-bang"><table class="bang">
            <thead><tr><th>Họ và tên</th><th>Cấp bậc</th><th>Đơn vị</th><th>Đối tượng</th><th class="so">Số buổi</th><th class="so">Vắng</th><th class="so">Chưa học bù</th><th class="so">Điểm trung bình</th><th class="so">Không đạt</th></tr></thead>
            <tbody>${watch
              .map(
                (w) => `<tr><td class="ten">${esc(w.p.hoTen)}</td><td>${esc(w.p.capBac)}</td><td>${esc(M.unitName(w.p.unitId))}</td>
                <td>${esc(App.dt(w.p.dt).ngan)}</td><td class="so">${w.agg.buoi}</td><td class="so">${w.agg.vang}</td>
                <td class="so">${w.agg.chuaBu ? `<span class="canh">${w.agg.chuaBu}</span>` : 0}</td>
                <td class="so">${w.diemN ? App.fmtNum(w.diemSum / w.diemN, 2) : ''}</td><td class="so">${w.agg.KD || ''}</td></tr>`
              )
              .join('')}</tbody></table></div>` : '<p>Không có đồng chí nào cần chú ý trong kỳ này.</p>'}
        </section>`;
      bindLineHover(box);
    }

    function watchList(d) {
      return Array.from(d.perPerson.values())
        .filter((w) => w.agg.chuaBu > 0 || w.agg.vang >= 2 || w.agg.KD > 0)
        .sort((a, b) => b.agg.chuaBu - a.agg.chuaBu || b.agg.KD - a.agg.KD || b.agg.vang - a.agg.vang);
    }
    draw();

    root.addEventListener('change', (e) => {
      const k = e.target.dataset.ch;
      if (!k) return;
      vs[k] = k === 'year' ? Number(e.target.value) : e.target.value;
      App.$('[data-ref="tuy-chon"]', root).hidden = vs.ky !== 'tuy-chon';
      draw();
    });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'in') window.print();
      else if (b.dataset.act === 'excel') App.excel.exportReport(data, watchList(data));
    });
  };
})(window.App);
