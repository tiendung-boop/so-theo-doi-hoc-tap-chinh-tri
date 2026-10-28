'use strict';
(function (App) {
  const esc = App.esc;
  const ui = (App.ui = {});

  ui.toast = (msg, kind) => {
    // Hộp thoại modal nằm ở lớp trên cùng (top layer), che mọi thứ bên ngoài; khi đang mở hộp thoại
    // thì đặt thông báo vào trong hộp thoại đó để người dùng vẫn thấy.
    const dlg = App.$$('dialog[open]').pop();
    let root = document.getElementById('toast-root');
    if (dlg) {
      root = App.$('.toast-host', dlg);
      if (!root) {
        root = document.createElement('div');
        root.className = 'toast-host';
        dlg.appendChild(root);
      }
    }
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast-' + kind : '');
    el.setAttribute('role', kind === 'loi' ? 'alert' : 'status');
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => el.remove(), kind === 'loi' ? 8000 : 3500);
  };

  // Hộp thoại dùng <dialog> gốc của trình duyệt: có sẵn khoá tiêu điểm và phím Esc để đóng.
  // actions: [{ label, kind, submit, onClick(dlg) }]; onClick trả về false để giữ hộp thoại mở.
  ui.modal = ({ title, body, actions, wide, onOpen }) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'hop-thoai' + (wide ? ' rong' : '');
    dlg.innerHTML = `<form class="ht-form" novalidate>
      <h2 class="ht-tieu-de">${esc(title)}</h2>
      <div class="ht-than">${body}</div>
      <div class="ht-nut">${actions
        .map(
          (a, i) =>
            `<button type="${a.submit ? 'submit' : 'button'}" class="nut ${a.kind || ''}" data-i="${i}">${esc(a.label)}</button>`
        )
        .join('')}</div>
    </form>`;
    document.getElementById('modal-root').appendChild(dlg);
    const close = () => {
      if (dlg.open) dlg.close();
      dlg.remove();
    };
    dlg.addEventListener('close', () => dlg.remove());
    let busy = false;
    const run = async (a) => {
      if (busy) return;
      if (!a.onClick) return close();
      busy = true;
      try {
        const r = await a.onClick(dlg);
        if (r !== false) close();
      } catch (e) {
        ui.toast(e.message || String(e), 'loi');
      } finally {
        busy = false;
      }
    };
    dlg.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const a = actions.find((x) => x.submit);
      if (a) run(a);
    });
    dlg.querySelectorAll('.ht-nut button').forEach((b) =>
      b.addEventListener('click', () => {
        const a = actions[Number(b.dataset.i)];
        if (!a.submit) run(a);
      })
    );
    dlg.showModal();
    if (onOpen) onOpen(dlg);
    const first = dlg.querySelector('[autofocus]');
    if (first) first.focus();
    return { dlg, close };
  };

  ui.confirm = (message, opts) => {
    const o = opts || {};
    return new Promise((resolve) => {
      let answered = false;
      const { dlg } = ui.modal({
        title: o.title || 'Xác nhận',
        body: `<p class="ht-loi-nhan">${message}</p>`,
        actions: [
          { label: 'Huỷ', onClick: () => { answered = true; resolve(false); } },
          {
            label: o.ok || 'Đồng ý',
            kind: o.danger ? 'nguy-hiem' : 'chinh',
            submit: true,
            onClick: () => { answered = true; resolve(true); },
          },
        ],
      });
      dlg.addEventListener('close', () => { if (!answered) resolve(false); });
    });
  };

  ui.download = (filename, data, type) => {
    const blob = data instanceof Blob ? data : new Blob([data], { type: type || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  ui.pickFile = (accept) =>
    new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept || '';
      input.addEventListener('change', () => resolve(input.files[0] || null));
      input.click();
    });

  ui.readText = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsText(file, 'utf-8');
    });

  ui.readBuffer = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsArrayBuffer(file);
    });

  ui.options = (list, selected) =>
    list
      .map((o) => `<option value="${esc(o.value)}"${String(o.value) === String(selected) ? ' selected' : ''}>${esc(o.label)}</option>`)
      .join('');

  ui.unitOptions = (selected, allLabel) =>
    ui.options(
      (allLabel ? [{ value: '', label: allLabel }] : []).concat(
        App.store.state.units.map((u) => ({ value: u.id, label: u.ten }))
      ),
      selected
    );

  ui.dtOptions = (selected, allLabel) =>
    ui.options(
      (allLabel ? [{ value: '', label: allLabel }] : []).concat(App.DT.map((d) => ({ value: d.ma, label: d.ten }))),
      selected
    );

  ui.xlChip = (ma) => (ma ? `<span class="xl xl-${ma}">${App.xl(ma).ky}</span>` : '');

  ui.empty = (title, text, buttons) =>
    `<div class="trong"><h3>${esc(title)}</h3><p>${text}</p>${buttons ? `<div class="hang-nut">${buttons}</div>` : ''}</div>`;

  // Các datalist gợi ý dùng chung cho mọi màn hình.
  ui.installDatalists = () => {
    const mk = (id, list) => `<datalist id="${id}">${list.map((v) => `<option value="${esc(v)}">`).join('')}</datalist>`;
    const div = document.createElement('div');
    div.hidden = true;
    div.innerHTML = mk('dl-capbac', App.GOI_Y.capBac) + mk('dl-chucvu', App.GOI_Y.chucVu) + mk('dl-lydo', App.GOI_Y.lyDo);
    document.body.appendChild(div);
  };

  // Lấy giá trị các ô nhập có thuộc tính name trong một vùng.
  ui.formData = (root) => {
    const o = {};
    App.$$('[name]', root).forEach((el) => {
      if (el.type === 'checkbox') {
        if (el.dataset.multi) {
          o[el.name] = o[el.name] || [];
          if (el.checked) o[el.name].push(el.value);
        } else o[el.name] = el.checked;
      } else o[el.name] = el.value.trim();
    });
    return o;
  };
})(window.App);
