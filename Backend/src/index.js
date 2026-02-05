require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { connectDb } = require("./db");
const NguoiDung = require("./models/NguoiDung");

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  }),
);
app.use(express.json());

/**
 * Healthcheck: dùng để kiểm tra backend có đang chạy hay không.
 * Không truy cập DB.
 */
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/**
 * Chuẩn hoá địa chỉ ví EVM để:
 * - đảm bảo lưu/tra cứu DB theo 1 chuẩn (lowercase)
 * - chặn input sai định dạng (tránh query/insert rác)
 *
 * @param {unknown} raw
 * @returns {string | null} địa chỉ ví chuẩn hoá (lowercase) hoặc null nếu không hợp lệ
 */
function normalizeDiaChiVi(raw) {
  if (!raw) return null;
  const diaChiVi = String(raw).trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(diaChiVi)) return null;
  return diaChiVi;
}

/**
 * API: Lấy profile theo địa chỉ ví (định danh web3).
 *
 * Luồng dữ liệu:
 * FE -> GET /api/profile/:dia_chi_vi -> normalize -> MongoDB findOne -> trả JSON.
 */
app.get("/api/profile/:dia_chi_vi", async (req, res) => {
  try {
    const diaChiVi = normalizeDiaChiVi(req.params.dia_chi_vi);
    if (!diaChiVi) {
      return res.status(400).json({ message: "Địa chỉ ví không hợp lệ" });
    }
    const user = await NguoiDung.findOne({ dia_chi_vi: diaChiVi }).lean();
    if (!user) return res.status(404).json({ message: "Không tìm thấy" });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

/**
 * API: Tạo/cập nhật profile (upsert) theo địa chỉ ví.
 *
 * Luồng dữ liệu:
 * FE -> PUT /api/profile/:dia_chi_vi (body) -> normalize ->
 * - build $set/$unset ("" hoặc null sẽ xoá field)
 * - findOneAndUpdate(upsert) -> trả JSON.
 *
 * Lưu ý: Đây là bản demo. Thực tế nên xác thực bằng chữ ký ví (signed message)
 * trước khi cho phép cập nhật hồ sơ.
 */
app.put("/api/profile/:dia_chi_vi", async (req, res) => {
  try {
    const diaChiVi = normalizeDiaChiVi(req.params.dia_chi_vi);
    if (!diaChiVi) {
      return res.status(400).json({ message: "Địa chỉ ví không hợp lệ" });
    }

    const now = new Date();

    const setDoc = { updated_at: now };
    const unsetDoc = {};

    const maybeSetOrUnset = (key) => {
      const value = req.body?.[key];
      if (value === undefined) return;
      if (value === null || value === "") {
        unsetDoc[key] = 1;
        return;
      }
      setDoc[key] = value;
    };

    // Chỉ cho phép cập nhật thông tin cá nhân cơ bản
    maybeSetOrUnset("ho_ten");
    maybeSetOrUnset("email");
    maybeSetOrUnset("so_dien_thoai");
    maybeSetOrUnset("dia_chi_lien_he");
    maybeSetOrUnset("avatar_url");

    const updateOps = {
      $set: setDoc,
      $setOnInsert: {
        dia_chi_vi: diaChiVi,
        trang_thai: "hoat_dong",
        created_at: now,
      },
    };
    if (Object.keys(unsetDoc).length > 0) {
      updateOps.$unset = unsetDoc;
    }

    const user = await NguoiDung.findOneAndUpdate(
      { dia_chi_vi: diaChiVi },
      updateOps,
      { new: true, upsert: true, runValidators: true },
    ).lean();

    return res.json(user);
  } catch (err) {
    // Duplicate email, etc.
    return res.status(400).json({ message: err.message });
  }
});

/**
 * Hàm main để:
 * - kết nối MongoDB
 * - start HTTP server
 */
async function main() {
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/blockchain_assets";

  await connectDb(mongoUri);

  const port = Number(process.env.PORT || 5000);
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
