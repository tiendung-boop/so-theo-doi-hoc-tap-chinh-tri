# Sổ theo dõi kết quả học tập chính trị

Phần mềm thay cho sổ giấy "Đăng ký theo dõi kết quả học tập chính trị", gồm bốn sổ: Sĩ quan, Quân nhân, HSQ-BS năm thứ nhất, HSQ-BS năm thứ hai. Phần mềm chạy trên máy tính, không cần cài đặt, không cần mạng Internet.

## Mở phần mềm

Mở file `index.html` bằng **Microsoft Edge** hoặc **Google Chrome** (nhấp chuột phải, chọn "Open with").

Khi chép sang máy khác, chép cả thư mục, gồm file `index.html` và thư mục `app`.

## Bắt đầu

1. Vào **Cài đặt, sao lưu**. Sửa tên trung đoàn, tiểu đoàn, năm theo dõi và danh sách đơn vị trực thuộc.
2. Vào **Danh sách quân nhân**, bấm **Tải file Excel mẫu**. Điền danh sách vào file mẫu rồi bấm **Nhập từ Excel**. Phần mềm cũng đọc được danh sách Excel sẵn có của đơn vị, miễn là có cột "Họ và tên".
3. Mở từng sổ, bấm **Thêm buổi học**, chọn ngày và đơn vị tham gia.
4. Trong buổi học:
   - Bấm ô **Có mặt** hoặc **Vắng** để điểm danh. Nút **Ghi có mặt cho người chưa điểm danh** đánh dấu có mặt cho tất cả những người chưa được điểm danh.
   - Nhập điểm kiểm tra theo thang 10, nhấn Enter để chuyển xuống người tiếp theo. Phần mềm tự xếp loại Giỏi, Khá, Đạt, Không đạt.
   - Dòng **Tổng** cuối bảng tự tính như trong sổ giấy.

## Học bù, học vét

Mục **Học bù, học vét** liệt kê mọi lượt vắng chưa học bù của cả tiểu đoàn. Đánh dấu nhiều người, chọn ngày rồi bấm ghi một lần. Có thể xuất danh sách ra Excel để gửi các đại đội.

## In sổ và báo cáo

- **In sổ**: in đúng mẫu sổ giấy, khổ A4 nằm ngang, có trang bìa. In được cho cả tiểu đoàn hoặc từng đại đội. Nút **Xuất Excel theo mẫu** xuất cùng nội dung ra file Excel.
- **Báo cáo**: thống kê theo năm, 6 tháng, quý hoặc tháng. Có số liệu theo đối tượng và theo đơn vị, biểu đồ, và danh sách quân nhân cần chú ý. Xuất được ra Excel.

## Giữ an toàn dữ liệu

Dữ liệu được lưu trong trình duyệt của máy đang dùng. Dữ liệu sẽ **mất** nếu trình duyệt bị xoá lịch sử và dữ liệu duyệt web, hoặc máy bị cài lại. Edge và Chrome lưu riêng, dữ liệu nhập trên trình duyệt này không hiện sang trình duyệt kia.

Có hai cách giữ dữ liệu an toàn. Nên dùng cả hai:

- **Tự động lưu ra file** (Cài đặt, sao lưu): chọn một file trên ổ D hoặc USB. Sau đó mỗi thay đổi đều được ghi vào file này. Mỗi lần mở lại phần mềm, bấm **Cho phép ghi** trên thanh nhắc ở đầu trang.
- **Sao lưu ra file**: tải về một file `.json`, nên làm hằng tuần. Phần mềm sẽ nhắc nếu quá 7 ngày chưa sao lưu.

Muốn chuyển sang máy khác, mở phần mềm trên máy mới, vào Cài đặt, bấm **Khôi phục từ file sao lưu** rồi chọn file `.json` đã lưu.

## Ngưỡng xếp loại

Mặc định theo thang điểm 10:

| Xếp loại | Điểm |
|---|---|
| Giỏi | từ 8 |
| Khá | từ 6,5 |
| Đạt | từ 5 |
| Không đạt | dưới 5 |

Nếu đơn vị dùng mức khác, sửa trong **Cài đặt, sao lưu**. Khi đổi ngưỡng, xếp loại của mọi kết quả đã nhập bằng điểm sẽ được tính lại.
