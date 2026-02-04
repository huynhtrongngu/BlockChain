const mongoose = require("mongoose");

const NguoiDungSchema = new mongoose.Schema(
  {
    dia_chi_vi: {
      type: String,
      required: true,
      unique: true,
      match: /^0x[a-fA-F0-9]{40}$/,
      index: true,
      trim: true,
      lowercase: true,
    },
    ho_ten: { type: String, trim: true },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      sparse: true,
      unique: true,
    },
    so_dien_thoai: { type: String, trim: true },
    dia_chi_lien_he: { type: String, trim: true },
    avatar_url: { type: String, trim: true },
    trang_thai: {
      type: String,
      enum: ["hoat_dong", "khoa"],
      default: "hoat_dong",
      required: true,
    },
  },
  {
    collection: "nguoi_dung",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

module.exports = mongoose.model("NguoiDung", NguoiDungSchema);
