'use strict';
// Lưu trữ: toàn bộ dữ liệu là một object JSON, ghi vào IndexedDB của trình duyệt.
// Có thể liên kết thêm một file .json trên ổ đĩa (File System Access API, chỉ Chrome/Edge)
// để mỗi lần lưu đều ghi ra file đó, phòng khi trình duyệt bị xoá dữ liệu.
(function (App) {
  const DB_NAME = 'so-theo-doi-hoc-tap-chinh-tri';
  const KV = 'kv';
  const SCHEMA_VERSION = 1;

  let dbPromise = null;
  function db() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(KV);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }
  async function idb(mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(KV, mode);
      const req = fn(tx.objectStore(KV));
      tx.oncomplete = () => resolve(req && req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  const idbGet = (k) => idb('readonly', (s) => s.get(k));
  const idbSet = (k, v) => idb('readwrite', (s) => s.put(v, k));
  const idbDel = (k) => idb('readwrite', (s) => s.delete(k));

  const DEFAULT_UNITS = ['Chỉ huy tiểu đoàn', 'Đại đội 1', 'Đại đội 2', 'Đại đội 3', 'Đại đội 4'];

  function emptyState() {
    return {
      version: SCHEMA_VERSION,
      meta: { trungDoan: 'Trung đoàn ...', tieuDoan: 'Tiểu đoàn ...', nam: new Date().getFullYear() },
      // Ngưỡng điểm (thang 10) cho từng mức xếp loại; dưới ngưỡng Đạt là Không đạt.
      settings: { nguong: { G: 8, K: 6.5, D: 5 } },
      units: DEFAULT_UNITS.map((ten) => ({ id: App.uid(), ten })),
      people: [],
      sessions: [],
      records: {},
      lastBackup: null,
      updatedAt: null,
    };
  }

  // Kiểm tra sơ bộ cấu trúc khi khôi phục từ file, tránh nạp nhầm file JSON khác.
  function validate(s) {
    const ok =
      s && typeof s === 'object' &&
      Array.isArray(s.units) && Array.isArray(s.people) && Array.isArray(s.sessions) &&
      s.records && typeof s.records === 'object' && s.meta && s.settings;
    if (!ok) throw new Error('File không đúng định dạng dữ liệu sổ theo dõi.');
    if (s.version > SCHEMA_VERSION) {
      throw new Error('File được tạo bởi phiên bản phần mềm mới hơn. Hãy cập nhật phần mềm.');
    }
    return s;
  }

  function migrate(s) {
    // Chưa có thay đổi cấu trúc; các phiên bản sau thêm bước chuyển đổi tại đây.
    s.version = SCHEMA_VERSION;
    s.settings = s.settings || {};
    s.settings.nguong = Object.assign({ G: 8, K: 6.5, D: 5 }, s.settings.nguong);
    return s;
  }

  const listeners = new Set();
  let writeChain = Promise.resolve();

  const S = (App.store = {
    state: null,
    fileHandle: null,
    // 'none' | 'ok' | 'need-permission' | 'error' | 'unsupported'
    fileStatus: 'none',
    lastError: null,

    async load() {
      try {
        const saved = await idbGet('state');
        S.state = saved ? migrate(validate(saved)) : emptyState();
      } catch (e) {
        S.lastError = e;
        S.state = emptyState();
      }
      if (!('showSaveFilePicker' in window)) {
        S.fileStatus = 'unsupported';
        return;
      }
      try {
        const h = await idbGet('fileHandle');
        if (h) {
          S.fileHandle = h;
          const p = await h.queryPermission({ mode: 'readwrite' });
          S.fileStatus = p === 'granted' ? 'ok' : 'need-permission';
        }
      } catch (e) {
        S.fileStatus = 'error';
      }
    },

    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    // Gọi sau mỗi thay đổi dữ liệu. Ghi thật sự sau 300 ms để gộp các thao tác liên tiếp.
    save() {
      listeners.forEach((fn) => fn());
      persistDebounced();
    },

    flush() {
      persistDebounced.flush();
      return writeChain;
    },

    async replaceState(newState) {
      S.state = migrate(validate(newState));
      listeners.forEach((fn) => fn());
      await persist();
    },

    toJSON() {
      return JSON.stringify(S.state, null, 1);
    },

    parseBackup(text) {
      let obj;
      try {
        obj = JSON.parse(text);
      } catch (e) {
        throw new Error('File sao lưu bị hỏng hoặc không phải file JSON.');
      }
      return validate(obj);
    },

    async markBackedUp() {
      S.state.lastBackup = new Date().toISOString();
      await persist();
    },

    async linkFile() {
      const h = await window.showSaveFilePicker({
        suggestedName: `so-theo-doi-hoc-tap-chinh-tri.json`,
        types: [{ description: 'Dữ liệu sổ theo dõi', accept: { 'application/json': ['.json'] } }],
      });
      S.fileHandle = h;
      S.fileStatus = 'ok';
      await idbSet('fileHandle', h);
      await persist();
    },

    async regrantFile() {
      if (!S.fileHandle) return;
      const p = await S.fileHandle.requestPermission({ mode: 'readwrite' });
      S.fileStatus = p === 'granted' ? 'ok' : 'need-permission';
      if (S.fileStatus === 'ok') await persist();
    },

    async unlinkFile() {
      S.fileHandle = null;
      S.fileStatus = 'none';
      await idbDel('fileHandle');
    },

    emptyState,
  });

  async function persist() {
    const st = S.state;
    st.updatedAt = new Date().toISOString();
    // Xếp hàng các lần ghi: createWritable() chạy song song trên cùng file sẽ ghi đè lẫn nhau.
    writeChain = writeChain.then(async () => {
      try {
        await idbSet('state', st);
      } catch (e) {
        S.lastError = e;
        App.ui && App.ui.toast('Không lưu được vào trình duyệt: ' + e.message, 'loi');
      }
      if (S.fileHandle && S.fileStatus === 'ok') {
        try {
          const w = await S.fileHandle.createWritable();
          await w.write(JSON.stringify(st, null, 1));
          await w.close();
        } catch (e) {
          S.fileStatus = 'error';
          App.ui && App.ui.toast('Không ghi được vào file dữ liệu: ' + e.message, 'loi');
          listeners.forEach((fn) => fn());
        }
      }
    });
    return writeChain;
  }
  const persistDebounced = App.debounce(persist, 300);

  // Ghi nốt thay đổi đang chờ khi người dùng chuyển tab hoặc đóng trình duyệt.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') S.flush();
  });
  window.addEventListener('pagehide', () => S.flush());
})(window.App);
