/**
 * Hướng dẫn chạy script này:
 * 1. Cài đặt MongoDB và mongosh.
 * 2. Mở terminal tại thư mục Database.
 * 3. Chạy lệnh: mongosh --file init_mongo.js
 */

// Chọn hoặc tạo mới database tên là 'blockchain_assets'
db = db.getSiblingDB("blockchain_assets");

// Tuỳ chọn: reset dữ liệu (KHÔNG khuyến nghị bật nếu bạn đã có dữ liệu thật)
const RESET_DB = false;
// Tuỳ chọn: seed dữ liệu mẫu
const SEED_SAMPLE = true;

// (Script này được thiết kế lại để CHỈ lưu thông tin cá nhân cơ bản)
if (RESET_DB) {
  try {
    db.nguoi_dung.drop();
  } catch (e) {
    // Bỏ qua nếu collection chưa tồn tại
  }
}

print("--- Đang khởi tạo CSDL 'blockchain_assets' ---");

// ==========================================
// 1. Tạo Collection: nguoi_dung (Thông tin cá nhân cơ bản)
// ==========================================
const nguoiDungValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["dia_chi_vi", "trang_thai", "created_at"],
    properties: {
      // Địa chỉ ví EVM (Metamask). Đây là định danh chính thay cho tài khoản/mật khẩu.
      dia_chi_vi: {
        bsonType: "string",
        pattern: "^0x[a-fA-F0-9]{40}$",
        description: "Địa chỉ ví EVM dạng 0x...40 hex",
      },

      // Thông tin cá nhân cơ bản (tùy chọn)
      ho_ten: { bsonType: "string" },
      email: { bsonType: "string", pattern: "^.+@.+$" },
      so_dien_thoai: {
        bsonType: "string",
        description: "SĐT dạng chuỗi (khuyến nghị lưu có +84 hoặc 0...)",
      },
      dia_chi_lien_he: { bsonType: "string" },
      avatar_url: { bsonType: "string" },

      // Trạng thái tài khoản
      trang_thai: { bsonType: "string", enum: ["hoat_dong", "khoa"] },

      created_at: { bsonType: "date" },
      updated_at: { bsonType: "date" },
    },
  },
};

const hasNguoiDung = db.getCollectionNames().includes("nguoi_dung");
if (!hasNguoiDung) {
  db.createCollection("nguoi_dung", {
    validator: nguoiDungValidator,
  });
} else {
  // Cập nhật validator nếu collection đã tồn tại
  db.runCommand({
    collMod: "nguoi_dung",
    validator: nguoiDungValidator,
    validationLevel: "moderate",
  });
}

// Tạo Index
db.nguoi_dung.createIndex({ dia_chi_vi: 1 }, { unique: true });
// Email là tùy chọn: dùng unique + sparse để tránh trùng email khi có giá trị
db.nguoi_dung.createIndex({ email: 1 }, { unique: true, sparse: true });

print("✓ Đã tạo bảng 'nguoi_dung'");
// ==========================================
// 2. Thêm Dữ Liệu Mẫu (Seeding)
// ==========================================
print("--- Đang thêm dữ liệu mẫu ---");

// Tạo Người Dùng (chỉ thông tin cơ bản)
if (SEED_SAMPLE && db.nguoi_dung.countDocuments({}) === 0) {
  db.nguoi_dung.insertMany([
    {
      ho_ten: "Nguyễn Văn A",
      email: "nguyen.a@example.com",
      so_dien_thoai: "+84 912 345 678",
      dia_chi_vi: "0x0000000000000000000000000000000000000001",
      trang_thai: "hoat_dong",
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      ho_ten: "Trần Thị Kiểm",
      email: "tran.b@example.com",
      so_dien_thoai: "+84 987 654 321",
      dia_chi_vi: "0x0000000000000000000000000000000000000002",
      trang_thai: "hoat_dong",
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
}

print("✓ Đã thêm dữ liệu mẫu thành công!");
