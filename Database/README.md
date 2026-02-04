# Hướng dẫn Cài đặt CSDL MongoDB

## Ghi chú về thiết kế CSDL (phiên bản tối giản)

Script [Database/init_mongo.js](init_mongo.js) đã được **thiết kế lại để chỉ lưu thông tin cá nhân cơ bản** cho người dùng.

- Không lưu mật khẩu (`mat_khau_bam`) vì dự án đăng nhập theo kiểu Web3 (định danh bằng `dia_chi_vi`).
- Collection chính: `nguoi_dung`
  - Bắt buộc: `dia_chi_vi`, `trang_thai`, `created_at`
  - Tùy chọn: `ho_ten`, `email`, `so_dien_thoai`, `dia_chi_lien_he`, `avatar_url`
  - Index: `dia_chi_vi` unique; `email` unique + sparse

Lỗi bạn gặp phải (`mongosh : The term ... is not recognized`) là do máy tính chưa cài đặt công cụ dòng lệnh MongoDB Shell hoặc chưa thiết lập biến môi trường.

## Cách 1: Cài đặt MongoDB Local (Khuyên dùng)

1. **Tải bộ cài đặt:**
   - Truy cập: [MongoDB Community Server Download](https://www.mongodb.com/try/download/community)
   - Chọn bản **Windows msi**.
   - **Lưu ý quan trọng khi cài:** Trong quá trình cài đặt, hãy tích chọn **"Install MongoDB Compass"** (giao diện quản lý trực quan).

2. **Cài đặt MongoDB Shell (mongosh):**
   - Truy cập: [MongoDB Shell Download](https://www.mongodb.com/try/download/shell)
   - Tải về, giải nén và thêm đường dẫn `bin` vào biến môi trường (Path) của Windows.
   - _Cách đơn giản hơn:_ Nếu bạn cài MongoDB Compass, bạn có thể dùng terminal tích hợp sẵn bên trong nó (tuy nhiên dòng lệnh là tốt nhất cho script).

3. **Thêm vào biến môi trường (Environment Variables):**
   - Tìm kiếm "Edit the system environment variables" trong Windows.
   - Chọn "Environment Variables" -> Tìm biến "Path" ở mục "System variables" -> Edit -> New.
   - Thêm đường dẫn tới thư mục cài đặt MongoDB (thường là `C:\Program Files\MongoDB\Server\7.0\bin`).

## Cách 2: Sử dụng MongoDB Compass (Giao diện đồ họa)

Nếu bạn không muốn cài dòng lệnh phức tạp:

1. Mở **MongoDB Compass** (đã cài ở bước 1).
2. Kết nối tới `mongodb://localhost:27017` (mặc định).
3. Tại danh sách bên trái, nhấn nút **+** (Create Database).
4. Đặt tên Database: `blockchain_assets`.
5. Collection đầu tiên: `nguoi_dung`.
6. Để chạy script tạo dữ liệu:
   - Trong Compass, tìm tab **"Mongosh"** (thường nằm ở dưới cùng cửa sổ).
   - Copy toàn bộ nội dung file `init_mongo.js`.
   - Paste vào cửa sổ dòng lệnh Mongosh đó và nhấn Enter.

## Cách 3: Chạy script này

Sau khi đã cài đặt xong:

1. Mở lại VS Code (để nhận biến môi trường mới).
2. Mở Terminal (`Ctrl + J`).
3. Chạy lại lệnh:
   ```powershell
   mongosh --file init_mongo.js
   ```
