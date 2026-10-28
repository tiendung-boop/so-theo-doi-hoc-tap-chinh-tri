'use strict';
// Mô hình dữ liệu
//   people[]  : { id, hoTen, capBac, chucVu, unitId, dt, ghiChu, active, thuTu }
//   sessions[]: { id, dt, ngay, noiDung, coKiemTra, members: [personId], ghiChu, nhom? }
//     Mỗi buổi học thuộc đúng một sổ (dt). Khi nhiều đối tượng học chung, phần mềm tạo một buổi
//     cho mỗi sổ và gán chung mã nhom; ngày, nội dung, có kiểm tra của cả nhóm luôn giống nhau.
//   records   : { [sessionId]: { [personId]: { dd: 'C'|'V', lyDo, diem, xl, bu } } }
//     dd = điểm danh (Có mặt / Vắng); diem = điểm kiểm tra thang 10;
//     xl = xếp loại nhập tay khi không có điểm; bu = ngày học bù, học vét.
// Danh sách tham gia (members) được chốt khi tạo buổi học, để quân nhân bổ sung hoặc
// chuyển đối tượng về sau không làm thay đổi số liệu của các buổi đã học.
(function (App) {
  // mau: màu bìa của từng sổ, là bước đậm của màu đối tượng trong biểu đồ (MAU_DT, baocao.js)
  // để cùng một sổ mang cùng một màu ở mọi màn hình; đủ tương phản (>= 4.5:1) với chữ trắng.
  // kh: ký hiệu rất ngắn cho cột Đối tượng trên bảng điểm danh học chung.
  App.DT = [
    { ma: 'SQ', ten: 'Sĩ quan', ngan: 'Sĩ quan', kh: 'SQ', bia: 'SĨ QUAN', mau: '#1c5cab' },
    { ma: 'QN', ten: 'Quân nhân chuyên nghiệp', ngan: 'QNCN', kh: 'QNCN', bia: 'QUÂN NHÂN CHUYÊN NGHIỆP', mau: '#b8501f' },
    { ma: 'BS1', ten: 'HSQ, BS năm thứ nhất', ngan: 'HSQ, BS năm 1', kh: 'BS năm 1', bia: 'HSQ, BS NĂM THỨ NHẤT', mau: '#12805a' },
    { ma: 'BS2', ten: 'HSQ, BS năm thứ hai', ngan: 'HSQ, BS năm 2', kh: 'BS năm 2', bia: 'HSQ, BS NĂM THỨ HAI', mau: '#9a6a00' },
  ];
  App.dt = (ma) => App.DT.find((d) => d.ma === ma);

  App.XL = [
    { ma: 'G', ten: 'Giỏi', ky: 'G' },
    { ma: 'K', ten: 'Khá', ky: 'K' },
    { ma: 'D', ten: 'Đạt', ky: 'Đ' },
    { ma: 'KD', ten: 'Không đạt', ky: 'KĐ' },
  ];
  App.xl = (ma) => App.XL.find((x) => x.ma === ma);

  App.GOI_Y = {
    capBac: [
      'Binh nhì', 'Binh nhất', 'Hạ sĩ', 'Trung sĩ', 'Thượng sĩ',
      'Thiếu úy', 'Trung úy', 'Thượng úy', 'Đại úy', 'Thiếu tá', 'Trung tá', 'Thượng tá', 'Đại tá',
      'Thiếu úy QNCN', 'Trung úy QNCN', 'Thượng úy QNCN', 'Đại úy QNCN', 'Thiếu tá QNCN', 'Trung tá QNCN',
    ],
    chucVu: [
      'Chiến sĩ', 'Tiểu đội phó', 'Tiểu đội trưởng', 'Trung đội phó', 'Trung đội trưởng',
      'Phó đại đội trưởng', 'Đại đội trưởng', 'Phó chính trị viên', 'Chính trị viên',
      'Tiểu đoàn trưởng', 'Chính trị viên tiểu đoàn', 'Nhân viên', 'Quân y', 'Văn thư',
    ],
    lyDo: ['Ốm', 'Phép', 'Tranh thủ', 'Công tác', 'Trực', 'Nằm viện', 'Học', 'Không lý do'],
  };

  const st = () => App.store.state;

  const M = (App.M = {
    unit: (id) => st().units.find((u) => u.id === id) || null,
    unitName: (id) => (M.unit(id) || {}).ten || '',
    person: (id) => st().people.find((p) => p.id === id) || null,
    session: (id) => st().sessions.find((s) => s.id === id) || null,

    unitIndex() {
      const m = new Map();
      st().units.forEach((u, i) => m.set(u.id, i));
      return m;
    },

    // Thứ tự như trong sổ: theo thứ tự đơn vị, trong đơn vị theo thứ tự nhập.
    sortPeople(list) {
      const ui = M.unitIndex();
      const rank = (p) => (ui.has(p.unitId) ? ui.get(p.unitId) : 9999);
      return list.slice().sort((a, b) => rank(a) - rank(b) || a.thuTu - b.thuTu);
    },

    peopleOf(dt, opts) {
      const o = opts || {};
      return M.sortPeople(
        st().people.filter(
          (p) => (!dt || p.dt === dt) && (o.all || p.active !== false) && (!o.unitId || p.unitId === o.unitId)
        )
      );
    },

    nextThuTu() {
      return st().people.reduce((m, p) => Math.max(m, p.thuTu || 0), 0) + 1;
    },

    classify(diem) {
      if (diem == null || Number.isNaN(diem)) return null;
      const n = st().settings.nguong;
      if (diem >= n.G) return 'G';
      if (diem >= n.K) return 'K';
      if (diem >= n.D) return 'D';
      return 'KD';
    },

    // Xếp loại lấy từ điểm nếu có (để đổi ngưỡng thì kết quả cũ cũng tính lại), nếu không thì lấy loại nhập tay.
    xepLoai(rec) {
      if (!rec) return null;
      if (typeof rec.diem === 'number') return M.classify(rec.diem);
      return rec.xl || null;
    },

    rec(sid, pid) {
      const r = st().records[sid];
      return (r && r[pid]) || null;
    },

    setRec(sid, pid, patch) {
      const all = st().records;
      const r = Object.assign({}, (all[sid] || {})[pid], patch);
      Object.keys(r).forEach((k) => {
        if (r[k] == null || r[k] === '') delete r[k];
      });
      if (!all[sid]) all[sid] = {};
      if (Object.keys(r).length) all[sid][pid] = r;
      else delete all[sid][pid];
      App.store.save();
      return r;
    },

    sessionsOf(dt, year) {
      return st()
        .sessions.filter((s) => (!dt || s.dt === dt) && (!year || App.yearOf(s.ngay) === year))
        .sort((a, b) => (a.ngay < b.ngay ? -1 : a.ngay > b.ngay ? 1 : 0));
    },

    years() {
      const ys = new Set([st().meta.nam]);
      st().sessions.forEach((s) => ys.add(App.yearOf(s.ngay)));
      return Array.from(ys).filter(Boolean).sort((a, b) => b - a);
    },

    members(s, unitId) {
      const list = s.members.map(M.person).filter(Boolean);
      return M.sortPeople(unitId ? list.filter((p) => p.unitId === unitId) : list);
    },

    emptyAgg() {
      return { buoi: 0, luot: 0, coMat: 0, vang: 0, chuaDD: 0, daBu: 0, chuaBu: 0, kt: 0, G: 0, K: 0, D: 0, KD: 0 };
    },

    addToAgg(agg, s, rec) {
      agg.luot++;
      if (rec && rec.dd === 'C') agg.coMat++;
      else if (rec && rec.dd === 'V') {
        agg.vang++;
        if (rec.bu) agg.daBu++;
        else agg.chuaBu++;
      } else agg.chuaDD++;
      if (s.coKiemTra) {
        const xl = M.xepLoai(rec);
        if (xl) {
          agg.kt++;
          agg[xl]++;
        }
      }
    },

    sessionStats(s, unitId) {
      const agg = M.emptyAgg();
      agg.buoi = 1;
      M.members(s, unitId).forEach((p) => M.addToAgg(agg, s, M.rec(s.id, p.id)));
      return agg;
    },

    // Danh sách lượt vắng. trangThai: 'chua' (chưa học bù), 'da' (đã học bù), '' (tất cả).
    absences(opts) {
      const o = opts || {};
      const out = [];
      M.sessionsOf(o.dt, o.year).forEach((s) => {
        M.members(s, o.unitId).forEach((p) => {
          const r = M.rec(s.id, p.id);
          if (!r || r.dd !== 'V') return;
          if (o.trangThai === 'chua' && r.bu) return;
          if (o.trangThai === 'da' && !r.bu) return;
          out.push({ s, p, r });
        });
      });
      return out;
    },

    countChuaHocBu() {
      let n = 0;
      st().sessions.forEach((s) => {
        const rs = st().records[s.id];
        if (!rs) return;
        s.members.forEach((pid) => {
          const r = rs[pid];
          if (r && r.dd === 'V' && !r.bu) n++;
        });
      });
      return n;
    },

    createSession(o) {
      const s = {
        id: App.uid(),
        dt: o.dt,
        ngay: o.ngay,
        noiDung: o.noiDung || '',
        coKiemTra: !!o.coKiemTra,
        members: o.members.slice(),
        ghiChu: o.ghiChu || '',
      };
      if (o.nhom) s.nhom = o.nhom;
      st().sessions.push(s);
      App.store.save();
      return s;
    },

    dtIndex: (ma) => App.DT.findIndex((d) => d.ma === ma),

    // Các buổi học chung với s (cùng mã nhom), theo thứ tự đối tượng; buổi học riêng trả về [s].
    group(s) {
      if (!s.nhom) return [s];
      return st()
        .sessions.filter((x) => x.nhom === s.nhom)
        .sort((a, b) => M.dtIndex(a.dt) - M.dtIndex(b.dt));
    },

    groupStats(sessions, dtFilter, unitId) {
      const agg = M.emptyAgg();
      sessions
        .filter((s) => !dtFilter || s.dt === dtFilter)
        .forEach((s) => M.members(s, unitId).forEach((p) => M.addToAgg(agg, s, M.rec(s.id, p.id))));
      return agg;
    },

    deleteSession(id) {
      const s = st();
      s.sessions = s.sessions.filter((x) => x.id !== id);
      delete s.records[id];
      App.store.save();
    },

    personRecordCount(pid) {
      let n = 0;
      Object.values(st().records).forEach((rs) => {
        if (rs[pid]) n++;
      });
      return n;
    },

    deletePeople(ids) {
      const set = new Set(ids);
      const s = st();
      s.people = s.people.filter((p) => !set.has(p.id));
      s.sessions.forEach((x) => {
        x.members = x.members.filter((pid) => !set.has(pid));
      });
      Object.values(s.records).forEach((rs) => ids.forEach((pid) => delete rs[pid]));
      App.store.save();
    },

    findUnitByName(name) {
      const n = App.norm(name);
      return st().units.find((u) => App.norm(u.ten) === n) || null;
    },

    ensureUnit(name) {
      const found = M.findUnitByName(name);
      if (found) return found;
      const u = { id: App.uid(), ten: String(name).trim() };
      st().units.push(u);
      return u;
    },
  });
})(window.App);
