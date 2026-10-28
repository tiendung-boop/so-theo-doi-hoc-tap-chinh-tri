# Sổ theo dõi kết quả học tập chính trị

Ứng dụng web chạy offline, thay sổ giấy "Đăng ký theo dõi kết quả học tập chính trị" cấp tiểu đoàn.
Có 4 sổ theo đối tượng: Sĩ quan (SQ), Quân nhân (QN), HSQ-BS năm thứ nhất (BS1), HSQ-BS năm thứ hai (BS2).
Ảnh sổ giấy mẫu: các file `.jpg` ở thư mục gốc (có tên người thật, không dùng làm dữ liệu mẫu hay đưa ra ngoài).

## Quyết định đã chốt với người dùng (28/10/2026)
- Chạy trên máy tính đơn vị, mở `index.html` bằng Edge/Chrome, không cài đặt, không cần Internet.
- Phạm vi tiểu đoàn, nhiều đại đội. Cột "Kiểm tra" chỉ nhập kết quả (điểm hoặc xếp loại), không thi trắc nghiệm.
- Có: in sổ đúng mẫu giấy, nhập/xuất Excel, báo cáo và biểu đồ, theo dõi học bù.

## Ràng buộc kỹ thuật
- Mở bằng `file://`, nên **không dùng ES module** (`type="module"` bị chặn) và không `fetch` file cục bộ.
  Mọi file là script thường, dùng chung `window.App`, nạp theo thứ tự trong `index.html`.
- Không gọi CDN lúc chạy. Thư viện để sẵn trong `app/lib/` (SheetJS 0.20.3 từ cdn.sheetjs.com).
- Dữ liệu là một object JSON lưu trong IndexedDB (`app/js/store.js`). Có thể ghi thêm ra file qua File System Access API.
  Đổi cấu trúc dữ liệu thì tăng `SCHEMA_VERSION` và viết bước chuyển đổi trong `migrate()`.
- Giao diện, comment và thông báo bằng tiếng Việt. Tên biến tiếng Việt không dấu (`hoTen`, `capBac`, `dt` = đối tượng).

## Cấu trúc
```
index.html              khung trang, thứ tự nạp script
app/css/app.css         toàn bộ giao diện + CSS in (A4 ngang, @page)
app/js/core.js          tiện ích chung (esc, ngày, số kiểu VN, norm bỏ dấu)
app/js/store.js         lưu trữ IndexedDB, sao lưu/khôi phục, tự lưu ra file
app/js/model.js         mô hình dữ liệu, xếp loại, thống kê buổi học (App.M)
app/js/ui.js            hộp thoại, thông báo, tải file (App.ui)
app/js/excel.js         nhập danh sách, xuất sổ/báo cáo/học bù (App.excel)
app/js/mau.js           dữ liệu mẫu (tên ngẫu nhiên)
app/js/views/*.js       từng màn hình; app.js là router theo #hash
```

## Quy ước dữ liệu
- `session.members` chốt danh sách người học khi tạo buổi. Không suy ra từ danh sách quân nhân hiện tại,
  để việc chuyển đối tượng/đơn vị về sau không làm đổi số liệu buổi cũ.
- Xếp loại tính từ `diem` theo ngưỡng trong Cài đặt; `xl` chỉ dùng khi không có điểm.
- Tỷ lệ G/K/Đ/KĐ tính trên số người có kết quả kiểm tra (như sổ giấy), không phải trên quân số.

## Giao diện
- Tông xanh navy (người dùng chọn), đỏ cờ chỉ dùng cho điểm nhấn và cảnh báo. Biến màu ở `:root` trong `app.css`.
- Mỗi sổ một màu bìa (`App.DT[].mau`), dùng nhất quán ở thanh bên, trang đầu, tiêu đề, cột đối tượng.
- Biểu tượng lấy từ `App.icon(name)` trong `core.js`. Bản in giữ đen trắng, Times New Roman.

## Kiểm thử
Chưa có test trong repo. Đã kiểm thử bằng script Playwright (Edge/Chromium headless) chạy ngoài thư mục dự án:
điểm danh, nhập điểm, dòng Tổng, học bù, nhập/xuất Excel, in PDF (số trang khớp bản xem trước), tải lại trang.
Màu biểu đồ đã chạy qua bộ kiểm tra bảng màu của skill dataviz (`MAU_XL`, `MAU_DT` trong `baocao.js`).
