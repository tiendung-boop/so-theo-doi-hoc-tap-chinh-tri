'use strict';
// Cài đặt: thông tin đơn vị, đơn vị trực thuộc, ngưỡng xếp loại, sao lưu và khôi phục dữ liệu.
(function (App) {
  const { esc, ui } = App;
  const S = App.store;

  App.backupNow = async () => {
    ui.download(`sao-luu-so-hoc-tap-chinh-tri-${App.todayISO()}.json`, S.toJSON(), 'application/json');
    await S.markBackedUp();
    ui.toast('Đã tải file sao lưu về thư mục Downloads.');
  };

  // Trước khi thay toàn bộ dữ liệu, tải về một bản sao lưu của dữ liệu đang có.
  async function replaceAll(newState, doneMsg) {
    if (S.state.people.length || S.state.sessions.length) {
      ui.download(`truoc-khi-thay-du-lieu-${App.todayISO()}.json`, S.toJSON(), 'application/json');
    }
    await S.replaceState(newState);
    ui.toast(doneMsg);
    App.go('#/');
  }

  App.taoDuLieuMau = async () => {
    const hasData = S.state.people.length || S.state.sessions.length;
    if (hasData) {
      const ok = await ui.confirm(
        'Dữ liệu mẫu sẽ thay thế toàn bộ dữ liệu hiện tại. Phần mềm sẽ tự tải về một file sao lưu dữ liệu hiện tại trước khi thay.',
        { ok: 'Thay bằng dữ liệu mẫu', danger: true }
      );
      if (!ok) return;
    }
    await replaceAll(App.sampleState(S.state.meta.nam), 'Đã tạo dữ liệu mẫu. Tên quân nhân trong dữ liệu mẫu là tên ngẫu nhiên.');
  };

  App.views['cai-dat'] = function (root) {
    const state = S.state;

    function draw() {
      const n = state.settings.nguong;
      const counts = new Map();
      state.people.forEach((p) => counts.set(p.unitId, (counts.get(p.unitId) || 0) + 1));
      const fileLine = {
        unsupported: 'Trình duyệt này không hỗ trợ tự động lưu ra file. Dùng Microsoft Edge hoặc Google Chrome để có chức năng này.',
        none: 'Chưa bật. Dữ liệu chỉ nằm trong trình duyệt, sẽ mất nếu trình duyệt bị xoá dữ liệu duyệt web.',
        ok: `Đang tự động lưu vào file <b>${esc(S.fileHandle && S.fileHandle.name)}</b> sau mỗi thay đổi.`,
        'need-permission': `Đã chọn file <b>${esc(S.fileHandle && S.fileHandle.name)}</b> nhưng cần cho phép ghi lại sau khi mở phần mềm.`,
        error: 'Lần ghi file gần nhất bị lỗi. Hãy chọn lại file.',
      }[S.fileStatus];

      root.innerHTML = `
        <header class="dau-trang"><div><h1>Cài đặt, sao lưu</h1></div></header>

        <section class="muc">
          <h2>Thông tin đơn vị</h2>
          <div class="luoi-form hep" data-ref="meta">
            <label>Trung đoàn <input name="trungDoan" value="${esc(state.meta.trungDoan)}"></label>
            <label>Tiểu đoàn <input name="tieuDoan" value="${esc(state.meta.tieuDoan)}"></label>
            <label>Năm theo dõi <input type="number" name="nam" min="2000" max="2100" value="${state.meta.nam}"></label>
          </div>
          <p class="mo">Tên trung đoàn, tiểu đoàn in trên bìa sổ. Năm theo dõi là năm hiển thị mặc định ở các sổ và trang đầu.</p>
        </section>

        <section class="muc">
          <h2>Đơn vị trực thuộc</h2>
          <div class="khung-bang hep"><table class="bang bang-dv">
            <thead><tr><th class="so">TT</th><th>Tên đơn vị</th><th class="so">Quân số</th><th></th></tr></thead>
            <tbody>${state.units
              .map(
                (u, i) => `<tr data-uid="${u.id}">
                <td class="so">${i + 1}</td>
                <td><input class="o-sua" name="tenDv" value="${esc(u.ten)}" aria-label="Tên đơn vị"></td>
                <td class="so">${counts.get(u.id) || 0}</td>
                <td class="c-nut">
                  <button class="nut nho phang" data-act="len"${i === 0 ? ' disabled' : ''} aria-label="Đưa ${esc(u.ten)} lên">Lên</button>
                  <button class="nut nho phang" data-act="xuong"${i === state.units.length - 1 ? ' disabled' : ''} aria-label="Đưa ${esc(u.ten)} xuống">Xuống</button>
                  <button class="nut nho phang nguy-hiem" data-act="xoa-dv"${counts.get(u.id) ? ' disabled title="Còn quân nhân thuộc đơn vị này"' : ''}>Xoá</button>
                </td></tr>`
              )
              .join('')}</tbody>
          </table></div>
          <div class="hang-nut">
            <input data-ref="dv-moi" placeholder="Tên đơn vị mới, ví dụ Đại đội 5" aria-label="Tên đơn vị mới">
            <button class="nut" data-act="them-dv">Thêm đơn vị</button>
          </div>
          <p class="mo">Thứ tự đơn vị cũng là thứ tự in trong sổ.</p>
        </section>

        <section class="muc">
          <h2>Xếp loại theo điểm kiểm tra</h2>
          <div class="nguong" data-ref="nguong">
            <label class="nhan-ngang">Giỏi từ <input name="G" inputmode="decimal" value="${App.fmtNum(n.G)}"> điểm</label>
            <label class="nhan-ngang">Khá từ <input name="K" inputmode="decimal" value="${App.fmtNum(n.K)}"> điểm</label>
            <label class="nhan-ngang">Đạt từ <input name="D" inputmode="decimal" value="${App.fmtNum(n.D)}"> điểm</label>
          </div>
          <p class="mo">Dưới mức Đạt là Không đạt. Thang điểm 10. Đổi ngưỡng thì xếp loại của mọi kết quả đã nhập bằng điểm được tính lại.</p>
        </section>

        <section class="muc">
          <h2>Lưu trữ và sao lưu</h2>
          <p>Lần sao lưu gần nhất: ${state.lastBackup ? new Date(state.lastBackup).toLocaleString('vi-VN') : 'chưa sao lưu lần nào'}.</p>
          <div class="hang-nut">
            <button class="nut chinh" data-act="sao-luu">${App.icon('download')}Sao lưu ra file</button>
            <button class="nut" data-act="khoi-phuc">${App.icon('upload')}Khôi phục từ file sao lưu</button>
          </div>
          <h3>Tự động lưu ra file</h3>
          <p>${fileLine}</p>
          <div class="hang-nut">
            ${S.fileStatus === 'unsupported' ? '' : `<button class="nut" data-act="lien-ket">${S.fileHandle ? 'Chọn file khác' : 'Chọn file để tự động lưu'}</button>`}
            ${S.fileStatus === 'need-permission' ? '<button class="nut chinh" data-act="cap-quyen">Cho phép ghi</button>' : ''}
            ${S.fileHandle ? '<button class="nut phang" data-act="bo-lien-ket">Ngừng tự động lưu</button>' : ''}
          </div>
          <p class="mo">Nên chọn file nằm trên ổ D hoặc USB để dữ liệu còn nguyên khi cài lại máy. Sang máy khác, dùng "Khôi phục từ file sao lưu" và chọn file đó.</p>
        </section>

        <section class="muc">
          <h2>Dùng thử và xoá dữ liệu</h2>
          <div class="hang-nut">
            <button class="nut" data-act="mau">Tạo dữ liệu mẫu</button>
            <button class="nut nguy-hiem" data-act="xoa-het">Xoá toàn bộ dữ liệu</button>
          </div>
        </section>`;
    }
    draw();

    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.closest('[data-ref="meta"]')) {
        if (t.name === 'nam') {
          const y = Number(t.value);
          if (!(y >= 2000 && y <= 2100)) {
            t.value = state.meta.nam;
            return ui.toast('Năm không hợp lệ.', 'loi');
          }
          state.meta.nam = y;
          App.viewState = {};
        } else if (!t.value.trim()) {
          t.value = state.meta[t.name];
          return ui.toast('Không được để trống.', 'loi');
        } else state.meta[t.name] = t.value.trim();
        S.save();
        App.renderNav();
        ui.toast('Đã lưu.');
      } else if (t.name === 'tenDv') {
        const u = state.units.find((x) => x.id === t.closest('tr').dataset.uid);
        if (!t.value.trim()) {
          t.value = u.ten;
          return ui.toast('Tên đơn vị không được để trống.', 'loi');
        }
        u.ten = t.value.trim();
        S.save();
        ui.toast('Đã đổi tên đơn vị.');
      } else if (t.closest('[data-ref="nguong"]')) {
        const box = t.closest('[data-ref="nguong"]');
        const v = {};
        ['G', 'K', 'D'].forEach((k) => (v[k] = App.parseNum(App.$(`[name="${k}"]`, box).value)));
        const ok = [v.G, v.K, v.D].every((x) => typeof x === 'number' && x >= 0 && x <= 10) && v.G > v.K && v.K > v.D;
        if (!ok) {
          draw();
          return ui.toast('Ngưỡng phải từ 0 đến 10 và giảm dần: Giỏi > Khá > Đạt.', 'loi');
        }
        state.settings.nguong = v;
        S.save();
        ui.toast('Đã lưu ngưỡng xếp loại.');
      }
    });

    root.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      const tr = b.closest('tr');
      const idx = tr ? state.units.findIndex((u) => u.id === tr.dataset.uid) : -1;
      try {
        if (act === 'len' || act === 'xuong') {
          const j = act === 'len' ? idx - 1 : idx + 1;
          [state.units[idx], state.units[j]] = [state.units[j], state.units[idx]];
          S.save();
          draw();
        } else if (act === 'xoa-dv') {
          state.units.splice(idx, 1);
          S.save();
          draw();
        } else if (act === 'them-dv') {
          const input = App.$('[data-ref="dv-moi"]', root);
          const ten = input.value.trim();
          if (!ten) return ui.toast('Nhập tên đơn vị.', 'loi');
          if (App.M.findUnitByName(ten)) return ui.toast('Đã có đơn vị này.', 'loi');
          state.units.push({ id: App.uid(), ten });
          S.save();
          draw();
        } else if (act === 'sao-luu') {
          await App.backupNow();
          draw();
        } else if (act === 'khoi-phuc') {
          const f = await ui.pickFile('.json,application/json');
          if (!f) return;
          const data = S.parseBackup(await ui.readText(f));
          const when = data.updatedAt ? new Date(data.updatedAt).toLocaleString('vi-VN') : 'không rõ';
          const ok = await ui.confirm(
            `File ${esc(f.name)} có ${data.people.length} quân nhân và ${data.sessions.length} buổi học, cập nhật lần cuối ${when}. ` +
              'Thay toàn bộ dữ liệu hiện tại bằng dữ liệu trong file? Phần mềm sẽ tự tải về một bản sao lưu dữ liệu hiện tại trước khi thay.',
            { ok: 'Khôi phục', danger: true }
          );
          if (ok) await replaceAll(data, 'Đã khôi phục dữ liệu từ file sao lưu.');
        } else if (act === 'lien-ket') {
          await S.linkFile();
          ui.toast('Từ giờ mỗi thay đổi đều được ghi vào file đã chọn.');
          draw();
          App.render();
        } else if (act === 'cap-quyen') {
          await S.regrantFile();
          App.render();
        } else if (act === 'bo-lien-ket') {
          await S.unlinkFile();
          draw();
        } else if (act === 'mau') {
          await App.taoDuLieuMau();
        } else if (act === 'xoa-het') {
          const ok = await ui.confirm(
            'Xoá toàn bộ quân nhân, buổi học và kết quả? Phần mềm sẽ tự tải về một bản sao lưu trước khi xoá.',
            { ok: 'Xoá toàn bộ', danger: true }
          );
          if (!ok) return;
          const fresh = S.emptyState();
          fresh.meta = Object.assign({}, state.meta);
          fresh.units = state.units.map((u) => Object.assign({}, u));
          await replaceAll(fresh, 'Đã xoá toàn bộ dữ liệu. Thông tin đơn vị được giữ lại.');
        }
      } catch (err) {
        // Người dùng bấm Huỷ trong hộp chọn file của trình duyệt.
        if (err && err.name === 'AbortError') return;
        ui.toast(err.message || String(err), 'loi');
      }
    });
  };
})(window.App);
