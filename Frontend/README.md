# Thiết kế giao diện "Ứng dụng đăng ký và xác thực quyền sở hữu tài sản"

## Mục tiêu tổng quát

- Truyền tải được tính minh bạch, tin cậy của công nghệ blockchain.
- Giúp người dùng (công dân, tổ chức, cán bộ xác thực) thao tác nhanh chóng với quy trình đăng ký và xác thực tài sản.
- Làm nổi bật trạng thái của tài sản (đang chờ duyệt, đã xác thực, bị tranh chấp...).

## Đối tượng người dùng chính

1. **Chủ sở hữu tài sản**: cần đăng ký tài sản mới, theo dõi tiến trình xác thực, lưu trữ chứng thư số.
2. **Đơn vị xác thực**: cần tiếp nhận hồ sơ, đối chiếu dữ liệu blockchain, phản hồi cho người dân.
3. **Bên thứ ba**: tra cứu chứng thực hoặc lịch sử quyền sở hữu.

## Điều hướng & Khung layout

- **Thanh điều hướng cố định** với logo, liên kết đến các phân hệ: Trang chủ, Đăng ký tài sản, Xác thực, Tra cứu, Hồ sơ cá nhân.
- **Hero section**: khẩu hiệu, mô tả ngắn gọn, nút CTA dẫn tới form đăng ký.
- **Lưới thông tin**: mô tả 3 bước chính (Tạo hồ sơ → Gửi lên mạng blockchain → Nhận chứng thư số).
- **Thẻ trạng thái**: hiển thị nhanh số lượng tài sản theo từng trạng thái cùng icon đồ họa.
- **Bảng dữ liệu**: danh sách tài sản gần đây, có badge trạng thái và liên kết tới chi tiết.
- **Bảng tiến trình (timeline)**: mô phỏng quá trình xác thực của một tài sản.
- **Footer**: thông tin liên hệ, tài liệu, mạng xã hội.

## Bảng màu & phong cách

- Nền sáng (#F5F7FB) kết hợp các điểm nhấn đậm (#1E3A8A, #00B5AD).
- Icon đường nét mảnh, biểu tượng blockchain/chuỗi khối.
- Font chữ gợi ý: "Inter" hoặc "Space Grotesk" cho tiêu đề; "Roboto" cho nội dung.

## Thành phần cốt lõi

1. **Asset Registration Form**

   - Các bước: Thông tin chung, Chi tiết pháp lý, Tài liệu đính kèm.
   - Hiển thị tiến trình (stepper) và trạng thái xác thực.

2. **Verification Timeline**

   - Hiển thị từng bước ghi nhận trên blockchain, mã hash, thời gian, cán bộ phụ trách.

3. **Asset Card / Table**

   - Danh sách tài sản với ảnh/biểu tượng, mã hồ sơ, trạng thái.
   - Hành động nhanh: xem chi tiết, tải chứng thư.

4. **Trust Badges & Metrics**

   - Tổng số hồ sơ đã xác thực, thời gian xử lý trung bình, số node tham gia.

5. **Notification Center**
   - Banner thông báo hoặc danh sách cập nhật theo thời gian thực.

## Khả năng mở rộng

- Tách component để dễ chuyển sang React/Vue nếu cần.
- Dự phòng các trang độc lập: Login, Dashboard quản trị, Trang chi tiết tài sản.

## Kế hoạch triển khai

1. Dựng khung HTML/CSS thuần (hoặc Vite + React) với các section đã liệt kê.
2. Thêm tương tác nhẹ bằng JavaScript (chọn trạng thái, preview timeline).
3. Hoàn thiện tài liệu UI kit (màu, typography, button, badge) để dễ tái sử dụng.
