'use strict';
// Dữ liệu mẫu để dùng thử. Tên được ghép ngẫu nhiên, không phải người thật.
(function (App) {
  // Bộ sinh số ngẫu nhiên có hạt giống (mulberry32) để dữ liệu mẫu lần nào cũng giống nhau.
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
  const DEM = ['Văn', 'Đức', 'Minh', 'Quốc', 'Thanh', 'Hữu', 'Công', 'Xuân', 'Ngọc', 'Trọng', 'Đình', 'Tiến'];
  const TEN = ['An', 'Bình', 'Cường', 'Dũng', 'Hải', 'Hùng', 'Khánh', 'Long', 'Nam', 'Phong', 'Quang', 'Sơn', 'Thắng',
    'Tuấn', 'Việt', 'Hiếu', 'Toàn', 'Đạt', 'Kiên', 'Lâm', 'Mạnh', 'Nghĩa', 'Phúc', 'Tài', 'Thành', 'Trung', 'Vinh'];
  const NOI_DUNG = [
    'Bài 1. Chủ nghĩa Mác - Lênin, tư tưởng Hồ Chí Minh',
    'Bài 2. Truyền thống của dân tộc và Quân đội nhân dân Việt Nam',
    'Bài 3. Chức năng, nhiệm vụ của Quân đội nhân dân Việt Nam',
    'Bài 4. Chủ quyền biển, đảo, biên giới quốc gia',
    'Bài 5. Phòng, chống "diễn biến hòa bình" trên lĩnh vực tư tưởng',
    'Bài 6. Mười lời thề danh dự và 12 điều kỷ luật',
    'Bài 7. Pháp luật Nhà nước, kỷ luật Quân đội',
    'Bài 8. Xây dựng đơn vị vững mạnh toàn diện "mẫu mực, tiêu biểu"',
    'Bài 9. Tình hình nhiệm vụ của đơn vị',
    'Bài 10. Thông tin thời sự trong nước và quốc tế',
  ];

  App.sampleState = function (year) {
    const r = rng(20261028);
    const pick = (a) => a[Math.floor(r() * a.length)];
    const s = App.store.emptyState();
    s.meta.nam = year;
    const units = s.units;
    let thuTu = 1;
    const person = (dt, unitId, capBac, chucVu) => {
      const p = { id: App.uid(), hoTen: `${pick(HO)} ${pick(DEM)} ${pick(TEN)}`, capBac, chucVu, unitId, dt, ghiChu: '', active: true, thuTu: thuTu++ };
      s.people.push(p);
      return p;
    };

    units.forEach((u, idx) => {
      const isCH = idx === 0;
      for (let i = 0; i < 4; i++) person('SQ', u.id, pick(['Thiếu úy', 'Trung úy', 'Thượng úy', 'Đại úy']), pick(isCH ? ['Tiểu đoàn trưởng', 'Chính trị viên tiểu đoàn', 'Phó tiểu đoàn trưởng'] : ['Đại đội trưởng', 'Chính trị viên', 'Trung đội trưởng']));
      for (let i = 0; i < (isCH ? 3 : 2); i++) person('QN', u.id, pick(['Thiếu úy QNCN', 'Trung úy QNCN', 'Thượng úy QNCN']), pick(['Nhân viên', 'Quân y', 'Văn thư']));
      if (isCH) return;
      for (let i = 0; i < 22; i++) person('BS1', u.id, pick(['Binh nhì', 'Binh nhì', 'Binh nhất']), 'Chiến sĩ');
      for (let i = 0; i < 18; i++) person('BS2', u.id, pick(['Binh nhất', 'Hạ sĩ', 'Trung sĩ']), pick(['Chiến sĩ', 'Chiến sĩ', 'Tiểu đội phó', 'Tiểu đội trưởng']));
    });

    // Lịch học: mỗi đối tượng khoảng 1 buổi/tháng từ tháng 1 tới trước ngày hôm nay.
    const today = App.todayISO();
    const plan = { SQ: 4, QN: 6, BS1: 9, BS2: 11 };
    App.DT.forEach((d, di) => {
      const members = s.people.filter((p) => p.dt === d.ma).map((p) => p.id);
      for (let m = 1; m <= 12; m++) {
        const ngay = `${year}-${App.pad2(m)}-${App.pad2(plan[d.ma] + di)}`;
        if (ngay >= today) break;
        const ses = { id: App.uid(), dt: d.ma, ngay, noiDung: NOI_DUNG[(m - 1) % NOI_DUNG.length], coKiemTra: m % 3 !== 0, members: members.slice(), ghiChu: '' };
        s.sessions.push(ses);
        const recs = (s.records[ses.id] = {});
        const recent = ngay.slice(0, 7) === today.slice(0, 7);
        members.forEach((pid) => {
          const rec = {};
          if (r() < 0.93) rec.dd = 'C';
          else {
            rec.dd = 'V';
            rec.lyDo = pick(['Ốm', 'Phép', 'Công tác', 'Trực', 'Tranh thủ']);
            if (!recent && r() < 0.75) {
              const bu = new Date(year, m - 1, plan[d.ma] + di + 3 + Math.floor(r() * 10));
              rec.bu = `${bu.getFullYear()}-${App.pad2(bu.getMonth() + 1)}-${App.pad2(bu.getDate())}`;
            }
          }
          if (ses.coKiemTra && (rec.dd === 'C' || rec.bu)) {
            const base = d.ma === 'SQ' ? 8.2 : d.ma === 'QN' ? 7.6 : d.ma === 'BS2' ? 7.3 : 6.9;
            const v = base + (r() + r() + r() - 1.5) * 2.2;
            rec.diem = Math.max(2, Math.min(10, Math.round(v * 4) / 4));
          }
          recs[pid] = rec;
        });
      }
    });
    return s;
  };
})(window.App);
