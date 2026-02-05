import React, { useState, useEffect } from "react";
import axios from "axios"; // Cần axios để fetch metadata

const MyAssets = ({ contract, account }) => {
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [transferData, setTransferData] = useState({ tokenId: "", to: "" });
  const [status, setStatus] = useState({ type: "", message: "" });

  // State cho chức năng Lịch sử & Trạng thái
  const [historyData, setHistoryData] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [editingStatusId, setEditingStatusId] = useState(null); // ID tài sản đang sửa trạng thái
  const [newStatusIndex, setNewStatusIndex] = useState(0);

  /**
   * Helper: chuyển status index (0..3) từ contract -> text hiển thị.
   */
  const getStatusText = (index) => {
    const statuses = ["Đang sử dụng", "Bảo trì", "Ngưng sử dụng", "Thanh lý"];
    return statuses[index] || "Không xác định";
  };

  /**
   * Helper: map status index -> màu badge UI.
   */
  const getStatusColor = (index) => {
    const colors = ["#4CAF50", "#FFC107", "#FF5722", "#9E9E9E"]; // Green, Amber, Deep Orange, Grey
    return colors[index] || "#000";
  };

  /**
   * Tự động tải danh sách tài sản khi có `contract` và `account`.
   */
  useEffect(() => {
    if (contract && account) {
      loadMyAssets();
    }
  }, [contract, account]);

  /**
   * Load danh sách NFT của ví hiện tại.
   *
   * Luồng dữ liệu:
   * - On-chain: getAssetsByOwner -> assetCodes/assetValues/assetStatuses/tokenURI
   * - Off-chain: tokenURI -> fetch metadata JSON từ IPFS gateway -> image/description/documents/type
   */
  const loadMyAssets = async () => {
    try {
      setIsLoading(true);
      setStatus({ type: "", message: "" });
      // 1. Lấy danh sách Token ID mà user sở hữu
      const tokenIds = await contract.getAssetsByOwner(account);

      const loadedAssets = [];

      // 2. Lặp qua từng Token ID để lấy chi tiết (Mã, Giá trị, URI)
      for (let i = 0; i < tokenIds.length; i++) {
        const tokenId = tokenIds[i];

        // Gọi song song các hàm để lấy thông tin
        const code = await contract.assetCodes(tokenId);
        const value = await contract.assetValues(tokenId);
        const uri = await contract.tokenURI(tokenId);
        // Lấy status index (0,1,2,3) từ Blockchain
        const statusIndex = await contract.assetStatuses(tokenId);

        // Fetch Metadata từ IPFS Gateway
        let image = "";
        let description = "";
        let documents = [];
        let type = "Tài sản";

        try {
          const metadataUrl = `https://gateway.pinata.cloud/ipfs/${uri}`;
          const metaRes = await axios.get(metadataUrl);
          image = metaRes.data.image;
          description = metaRes.data.description;
          documents = metaRes.data.documents || [];

          // Lấy Type từ attributes
          if (metaRes.data.attributes) {
            const typeAttr = metaRes.data.attributes.find(
              (attr) => attr.trait_type === "Type",
            );
            if (typeAttr) type = typeAttr.value;
          }
        } catch (err) {
          console.log("Lỗi fetch metadata", err);
          // Fallback nếu URI cũ là link ảnh trực tiếp
          image = `https://gateway.pinata.cloud/ipfs/${uri}`;
        }

        loadedAssets.push({
          id: tokenId.toString(),
          code: code,
          value: value.toString(),
          uri: uri,
          image: image,
          description: description,
          documents: documents,
          type: type,
          status: getStatusText(statusIndex), // Hàm chuyển số thành chữ
          statusId: statusIndex.toString(), // Lưu mã số để dùng cập nhật sau này
        });
      }

      setAssets(loadedAssets);
    } catch (error) {
      console.error("Lỗi tải tài sản:", error);
      setAssets([]);
      setStatus({
        type: "error",
        message:
          "Không tải được danh sách tài sản. " +
          (error?.shortMessage || error?.reason || error?.message || ""),
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Xem lịch sử vòng đời tài sản dựa trên event logs.
   *
   * Luồng dữ liệu:
   * - Query logs: AssetMinted / AssetStatusUpdated / AssetTransferred
   * - Chunk theo block range để tránh giới hạn RPC eth_getLogs
   * - Chuẩn hoá + sort để hiển thị timeline
   */
  const handleViewHistory = async (tokenId) => {
    try {
      if (!contract) {
        setStatus({ type: "error", message: "Vui lòng kết nối ví!" });
        return;
      }
      setStatus({ type: "loading", message: "Đang tải lịch sử giao dịch..." });
      setShowHistoryModal(true);
      setHistoryData([]);
      setHistoryError("");
      setHistoryLoading(true);

      const provider = contract.runner?.provider || contract.provider;
      if (!provider) {
        throw new Error("Không tìm thấy provider để truy vấn lịch sử");
      }

      const latestBlock = await provider.getBlockNumber();
      // Nhiều RPC giới hạn số block tối đa cho eth_getLogs (ví dụ 2000).
      // Vì vậy phải query theo chunks nhỏ.
      const MAX_BLOCK_RANGE = 1999; // diff(to-from) <= 1999 => tối đa 2000 blocks
      // Với demo: quét các block gần đây. Nếu tài sản được mint lâu hơn, hãy tăng LOOKBACK_BLOCKS.
      const LOOKBACK_BLOCKS = 20000;
      const fromBlock = Math.max(0, latestBlock - LOOKBACK_BLOCKS);

      const queryFilterChunked = async (filter) => {
        const all = [];
        for (
          let start = fromBlock;
          start <= latestBlock;
          start += MAX_BLOCK_RANGE + 1
        ) {
          const end = Math.min(latestBlock, start + MAX_BLOCK_RANGE);
          // eslint-disable-next-line no-await-in-loop
          const part = await contract.queryFilter(filter, start, end);
          all.push(...part);
        }
        return all;
      };

      // 1. Lọc các sự kiện liên quan đến TokenID này
      // Lưu ý: filter chỉ lấy dữ liệu đã được index, có thể mất thời gian nếu mạng chậm
      const filterMint = contract.filters.AssetMinted(BigInt(tokenId));
      const filterStatus = contract.filters.AssetStatusUpdated(BigInt(tokenId));
      const filterTransfer = contract.filters.AssetTransferred(BigInt(tokenId));

      const [mints, statuses, transfers] = await Promise.all([
        queryFilterChunked(filterMint),
        queryFilterChunked(filterStatus),
        queryFilterChunked(filterTransfer),
      ]);

      // 2. Chuẩn hóa dữ liệu
      const history = [];

      for (const evt of mints) {
        let timeText = "Ban đầu";
        try {
          const block = await provider.getBlock(evt.blockNumber);
          if (block?.timestamp) {
            timeText = new Date(
              Number(block.timestamp) * 1000,
            ).toLocaleString();
          }
        } catch (_e) {
          // ignore, fallback to "Ban đầu"
        }

        history.push({
          type: "TẠO MỚI",
          description: `Tài sản được khởi tạo. Giá trị: ${evt.args[3].toString()} VNĐ`,
          by: evt.args[1], // owner
          time: timeText,
          txHash: evt.transactionHash,
          sortKey: evt.blockNumber * 1000000 + evt.index,
        });
      }

      statuses.forEach((evt) => {
        history.push({
          type: "CẬP NHẬT TRẠNG THÁI",
          description: `Đổi sang: ${getStatusText(Number(evt.args[1]))}`,
          by: evt.args[2], // updatedBy
          time: new Date(Number(evt.args[3]) * 1000).toLocaleString(),
          txHash: evt.transactionHash,
          sortKey: evt.blockNumber * 1000000 + evt.index,
        });
      });

      transfers.forEach((evt) => {
        history.push({
          type: "CHUYỂN QUYỀN",
          description: `Chuyển từ ${evt.args[1].slice(0, 6)}... sang ${evt.args[2].slice(0, 6)}...`,
          by: evt.args[1], // from
          time: new Date(Number(evt.args[3]) * 1000).toLocaleString(),
          txHash: evt.transactionHash,
          sortKey: evt.blockNumber * 1000000 + evt.index,
        });
      });

      // Sắp xếp theo block/log index (mới nhất lên đầu)
      history.sort((a, b) => a.sortKey - b.sortKey);
      setHistoryData(history.reverse());
      setStatus({ type: "", message: "" });
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", message: "Lỗi tải lịch sử" });
      setHistoryError(error?.message || "Lỗi tải lịch sử");
    } finally {
      setHistoryLoading(false);
    }
  };

  /**
   * Cập nhật trạng thái vòng đời của tài sản.
   *
   * Luồng dữ liệu:
   * UI chọn status (0..3) -> gọi tx `updateAssetStatus(tokenId, statusIndex)` -> chờ mined -> reload danh sách.
   *
   * Lưu ý: Contract chỉ cho phép CHỦ SỞ HỮU token cập nhật trạng thái.
   */
  const handleUpdateStatus = async () => {
    if (!editingStatusId) return;
    try {
      setStatus({ type: "loading", message: "Đang cập nhật trạng thái..." });

      const tx = await contract.updateAssetStatus(
        editingStatusId,
        newStatusIndex,
      );
      await tx.wait(); // Chờ xác nhận

      setStatus({
        type: "success",
        message: "Cập nhật trạng thái thành công!",
      });
      setEditingStatusId(null);
      loadMyAssets(); // Tải lại danh sách
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message: "Lỗi: " + (error.reason || error.message),
      });
    }
  };

  /**
   * Chuyển nhượng NFT (quyền sở hữu token).
   *
   * Luồng dữ liệu:
   * UI nhập địa chỉ nhận -> gọi tx `transferAsset(to, tokenId)` -> chờ mined -> reload danh sách.
   */
  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!contract) return alert("Vui lòng kết nối ví!");

    try {
      setStatus({ type: "loading", message: "Đang xử lý chuyển nhượng..." });

      // Gọi hàm transferAsset mới (đơn giản hơn safeTransferFrom)
      const tx = await contract.transferAsset(
        transferData.to,
        transferData.tokenId,
      );

      setStatus({
        type: "loading",
        message: "Đang chờ xác nhận trên Blockchain...",
      });
      await tx.wait();

      setStatus({
        type: "success",
        message: `Chuyển NFT #${transferData.tokenId} thành công!`,
      });

      // Reset form và load lại danh sách
      setTransferData({ tokenId: "", to: "" });
      loadMyAssets();
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message: "Lỗi: " + (error.reason || error.message),
      });
    }
  };

  return (
    <div className="">
      <h2 className="page-title">Ví Tài Sản NFT Của Tôi</h2>

      {status.message && (
        <div className={`status-box ${status.type}`}>{status.message}</div>
      )}

      {/* 1. Danh sách tài sản */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        {isLoading ? (
          <p style={{ color: "white" }}>Đang tải tài sản trên Blockchain...</p>
        ) : assets.length === 0 ? (
          <p style={{ color: "#aaa" }}>Bạn chưa sở hữu tài sản nào.</p>
        ) : (
          assets.map((asset) => (
            <div key={asset.id} className="card" style={{ padding: "15px" }}>
              <div
                style={{
                  height: "150px",
                  background: "#333",
                  marginBottom: "10px",
                  borderRadius: "4px",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={asset.image}
                  alt={asset.code}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ margin: "5px 0", color: "#4CAF50" }}>
                  {asset.code}
                </h3>
                <div style={{ display: "flex", gap: "5px" }}>
                  <span
                    style={{
                      background: "#61dafb",
                      color: "#000",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "10px",
                      fontWeight: "bold",
                    }}
                  >
                    {asset.type}
                  </span>
                  <span
                    style={{
                      background: getStatusColor(asset.statusId),
                      color: "#fff",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "10px",
                      fontWeight: "bold",
                    }}
                  >
                    {asset.status}
                  </span>
                </div>
              </div>
              <p style={{ margin: "5px 0", fontSize: "14px" }}>
                Giá trị: {Number(asset.value).toLocaleString()} VNĐ
              </p>

              {asset.description && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "#ccc",
                    fontStyle: "italic",
                  }}
                >
                  "{asset.description}"
                </p>
              )}

              <p style={{ fontSize: "12px", color: "#888" }}>
                Token ID: #{asset.id}
              </p>

              {/* Hiển thị danh sách hồ sơ đính kèm */}
              {asset.documents && asset.documents.length > 0 && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "8px",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: "4px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "11px",
                      margin: "0 0 5px 0",
                      color: "#aaa",
                      textTransform: "uppercase",
                    }}
                  >
                    Hồ sơ đính kèm:
                  </p>
                  {asset.documents.map((doc, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: "12px",
                        marginBottom: "4px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#61dafb", textDecoration: "none" }}
                      >
                        📄 {doc.name || `Tài liệu ${idx + 1}`}
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Nút thao tác: Chuyển đi | History | Update Status */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "5px",
                  marginTop: "10px",
                }}
              >
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: "12px", background: "#555" }}
                  onClick={() => handleViewHistory(asset.id)}
                >
                  🕒 Lịch sử
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: "12px", background: "#FF9800" }}
                  onClick={() => {
                    setEditingStatusId(asset.id);
                    setNewStatusIndex(Number(asset.statusId)); // Set dđúng status hiện tại
                  }}
                >
                  ⚙️ Trạng thái
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ gridColumn: "span 2", fontSize: "12px" }}
                  onClick={() =>
                    setTransferData({ ...transferData, tokenId: asset.id })
                  }
                >
                  📤 Chuyển Quyền SH
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- MODAL CẬP NHẬT TRẠNG THÁI --- */}
      {editingStatusId && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="card"
            style={{ width: "400px", border: "1px solid #FF9800" }}
          >
            <h3>Cập Nhật Trạng Thái #{editingStatusId}</h3>
            <div className="form-group">
              <label className="form-label">Chọn trạng thái mới:</label>
              <select
                className="form-input"
                value={newStatusIndex}
                onChange={(e) => setNewStatusIndex(Number(e.target.value))}
              >
                <option value={0}>🟢 Đang sử dụng</option>
                <option value={1}>🟡 Bảo trì / Quy hoạch</option>
                <option value={2}>🟠 Ngưng sử dụng</option>
                <option value={3}>⚫ Thanh lý / Hủy</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button className="btn btn-primary" onClick={handleUpdateStatus}>
                Lưu Thay Đổi
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setEditingStatusId(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL XEM LỊCH SỬ --- */}
      {showHistoryModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="card"
            style={{
              width: "600px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h3>📜 Lịch Sử Vòng Đời Tài Sản</h3>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                marginTop: "10px",
                paddingRight: "5px",
              }}
            >
              {historyData.length === 0 ? (
                <p>
                  {historyLoading
                    ? "Đang tải lịch sử..."
                    : historyError
                      ? `Lỗi: ${historyError}`
                      : "Chưa có dữ liệu lịch sử."}
                </p>
              ) : (
                historyData.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderLeft: "2px solid #61dafb",
                      paddingLeft: "15px",
                      marginBottom: "20px",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: "-6px",
                        top: "0",
                        width: "10px",
                        height: "10px",
                        background: "#61dafb",
                        borderRadius: "50%",
                      }}
                    ></div>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: "bold",
                        color: "#61dafb",
                      }}
                    >
                      {item.type}
                    </p>
                    <p style={{ margin: "5px 0" }}>{item.description}</p>
                    <p style={{ fontSize: "12px", color: "#aaa", margin: 0 }}>
                      🕒 {item.time} <br />
                      👤 Bởi: {item.by.slice(0, 6)}...{item.by.slice(-4)}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowHistoryModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Form Chuyển nhượng */}
      {transferData.tokenId && (
        <div className="card" style={{ border: "1px solid #4CAF50" }}>
          <h3>Chuyển Nhượng NFT #{transferData.tokenId}</h3>
          <form onSubmit={handleTransfer}>
            <div className="form-group">
              <label className="form-label">Chuyển đến địa chỉ ví:</label>
              <input
                className="form-input"
                value={transferData.to}
                onChange={(e) =>
                  setTransferData({ ...transferData, to: e.target.value })
                }
                placeholder="0x..."
                required
              />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Xác Nhận Chuyển
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setTransferData({ tokenId: "", to: "" })}
                style={{ background: "#555" }}
              >
                Hủy
              </button>
            </div>
          </form>
          {status.message && (
            <div
              className={`status-box ${status.type}`}
              style={{ marginTop: "10px" }}
            >
              {status.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyAssets;
