import React, { useState } from "react";
import axios from "axios";

// CẤU HÌNH PINATA IPFS (Bạn cần thay bằng Key của mình sau khi đăng ký Pinata)
// Lưu ý: Trong dự án thực tế, KHÔNG lưu key trực tiếp ở Frontend vì lý do bảo mật.
// Nên dùng Backend làm trung gian hoặc biến môi trường (.env).
const PINATA_API_KEY = "fd303b208c69fc5936d9";
const PINATA_SECRET_KEY =
  "f1b3466b9405e64a859b3c821d68e1b71331c45cb1f7b9b8d8eee62e18fcbcc2";

const RegisterAsset = ({ contract, account }) => {
  const [formData, setFormData] = useState({
    code: "",
    value: "",
    description: "", // Thêm trường mô tả
  });
  const [files, setFiles] = useState([]); // State lưu danh sách file
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);

  // Hàm upload file lên Pinata
  const uploadToIPFS = async (fileToUpload) => {
    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

    let data = new FormData();
    data.append("file", fileToUpload);

    const res = await axios.post(url, data, {
      maxContentLength: "Infinity",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
    });

    return res.data.IpfsHash;
  };

  // Hàm upload JSON Metadata lên Pinata
  const uploadMetadataToIPFS = async (
    name,
    description,
    imageHash,
    documents,
    type,
  ) => {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;

    const metadata = {
      name: name,
      description: description,
      image: `https://gateway.pinata.cloud/ipfs/${imageHash}`,
      documents: documents,
      attributes: [
        { trait_type: "Type", value: type }, // Lưu loại tài sản vào đây
        {
          trait_type: "Created Date",
          value: new Date().toISOString().split("T")[0],
        },
      ],
    };

    const res = await axios.post(url, metadata, {
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
    });
    return res.data.IpfsHash;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!contract) return alert("Vui lòng kết nối ví trước!");

    try {
      setIsLoading(true);
      setStatus({ type: "loading", message: "Đang xử lý..." });

      if (files.length === 0) {
        throw new Error("Vui lòng chọn ít nhất 1 file hồ sơ!");
      }

      // 1. Upload Loop (Duyệt qua danh sách file và upload từng cái)
      const uploadedDocs = [];
      let mainImageHash = "";

      setStatus({
        type: "loading",
        message: `Đang upload ${files.length} hồ sơ lên IPFS...`,
      });

      for (let i = 0; i < files.length; i++) {
        const hash = await uploadToIPFS(files[i]);
        uploadedDocs.push({
          name: files[i].name,
          url: `https://gateway.pinata.cloud/ipfs/${hash}`,
          type: files[i].type,
        });

        // Lấy file đầu tiên làm ảnh đại diện
        if (i === 0) mainImageHash = hash;
      }

      // 2. Upload Metadata (Chứa Mô tả + Image Hash + Danh sách Files)
      setStatus({
        type: "loading",
        message: "Đang tạo Metadata chuẩn NFT...",
      });
      const tokenURI = await uploadMetadataToIPFS(
        formData.code,
        formData.description,
        mainImageHash,
        uploadedDocs,
        formData.type, // Truyền loại tài sản vào hàm tạo metadata
      );

      console.log("Metadata Hash:", tokenURI);

      // 3. Ghi vào Blockchain (Lưu Metadata Hash)
      setStatus({
        type: "loading",
        message: "Đang gửi giao dịch Blockchain... Vui lòng xác nhận ví.",
      });

      const tx = await contract.registerAsset(
        account,
        formData.code,
        tokenURI, // Đây bây giờ là Hash của file JSON (Metadata)
        formData.value,
      );

      setStatus({
        type: "loading",
        message: "Đang chờ xác nhận block (Mining)...",
      });

      await tx.wait();

      setStatus({
        type: "success",
        message: `Thành công! Tài sản ${formData.code} đã được ghi vào Blockchain.`,
      });
      // Reset form
      setFormData({
        code: "",
        value: "",
        description: "",
        type: "Bất động sản",
      });
      setFiles([]);
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message: "Thất bại: " + (error.reason || error.message),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý khi chọn file
  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="card">
      <h2>Đăng Ký Tài Sản Mới</h2>

      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label className="form-label">Loại Tài Sản</label>
          <select
            className="form-input"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            <option value="Bất động sản">🏠 Bất động sản (Nhà/Đất)</option>
            <option value="Phương tiện">🚗 Phương tiện (Ô tô/Xe máy)</option>
            <option value="Đồ quý hiếm">
              💎 Đồ quý hiếm (Trang sức/Cổ vật)
            </option>
            <option value="Tài sản số">💻 Tài sản số / IP</option>
            <option value="Khác">📦 Khác</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Mã Tài Sản</label>
          <input
            className="form-input"
            type="text"
            placeholder="VD: ASSET-2024-001"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Mô tả chi tiết</label>
          <textarea
            className="form-input"
            rows="3"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Ví dụ: Lô đất 100m2, Sổ đỏ chính chủ..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">Giá trị định giá (VNĐ)</label>
          <input
            className="form-input"
            type="number"
            placeholder="VD: 5000000000"
            value={formData.value}
            onChange={(e) =>
              setFormData({ ...formData, value: e.target.value })
            }
            required
          />
        </div>

        {/* Khu vực Upload Sổ đỏ/Giấy tờ */}
        <div
          className="form-group"
          style={{
            background: "#f9fafb",
            padding: "1rem",
            borderRadius: "8px",
            border: "1px dashed #ccc",
          }}
        >
          <label className="form-label">Hồ sơ pháp lý (Sổ đỏ/Hợp đồng)</label>

          <input
            type="file"
            multiple // Cho phép chọn nhiều file
            onChange={handleFileChange}
            style={{ marginBottom: "0.5rem" }}
          />
          <small style={{ display: "block", color: "#666" }}>
            * Hỗ trợ chọn nhiều file cùng lúc
          </small>
          {files.length > 0 && (
            <p style={{ fontSize: "13px", color: "blue" }}>
              Đã chọn: {files.length} file
            </p>
          )}
        </div>

        <button
          className="btn btn-primary"
          type="submit"
          style={{ width: "100%", marginTop: "1rem" }}
          disabled={!contract || isLoading}
        >
          {isLoading ? "Đang xử lý..." : "Ghi lên Blockchain"}
        </button>
      </form>

      {status.message && (
        <div className={`status-box ${status.type}`}>{status.message}</div>
      )}
    </div>
  );
};

export default RegisterAsset;
