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

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

function normalizeDiaChiVi(raw) {
  if (!raw) return null;
  const diaChiVi = String(raw).trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(diaChiVi)) return null;
  return diaChiVi;
}

// Lấy profile theo địa chỉ ví
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

// Tạo/cập nhật profile (demo). Thực tế nên yêu cầu user ký message để xác thực.
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
