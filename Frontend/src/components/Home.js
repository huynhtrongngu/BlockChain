import React, { useState, useEffect } from "react";

const Home = ({ contract, account }) => {
  const [stats, setStats] = useState({
    totalAssets: 0,
    totalValue: 0,
    byStatus: [0, 0, 0, 0], // Active, Maintenance, Retired, Liquidated
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (contract && account) {
      setErrorMessage("");
      fetchWalletStats();
    } else {
      setStats({ totalAssets: 0, totalValue: 0, byStatus: [0, 0, 0, 0] });
    }
  }, [contract, account]);

  const fetchWalletStats = async () => {
    setIsLoading(true);
    let totalValue = BigInt(0);
    let byStatus = [0, 0, 0, 0];

    try {
      const tokenIds = await contract.getAssetsByOwner(account);

      const details = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const [value, statusIndex] = await Promise.all([
            contract.assetValues(tokenId),
            contract.assetStatuses(tokenId),
          ]);
          return { value, statusIndex };
        }),
      );

      for (const item of details) {
        totalValue += BigInt(item.value);
        const statusIdx = Number(item.statusIndex);
        if (byStatus[statusIdx] !== undefined) {
          byStatus[statusIdx]++;
        }
      }

      const totalAssets = tokenIds.length;

      setStats({
        totalAssets,
        totalValue: totalValue.toString(),
        byStatus,
      });
    } catch (error) {
      console.error("Lỗi thống kê:", error);
      setErrorMessage(
        error?.shortMessage ||
          error?.reason ||
          error?.message ||
          "Lỗi thống kê",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (index) => {
    const labels = ["Đang sử dụng", "Bảo trì", "Ngưng sử dụng", "Thanh lý"];
    return labels[index];
  };

  const getStatusColor = (index) => {
    const colors = ["#4CAF50", "#FFC107", "#FF5722", "#9E9E9E"];
    return colors[index];
  };

  return (
    <div style={{ padding: "20px", color: "white" }}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ color: "#61dafb" }}>
          Hệ Thống Quản Lý Tài Sản Blockchain
        </h1>
        <p style={{ color: "#ccc" }}>Minh bạch - An toàn - Chính xác</p>
      </div>

      {!account && (
        <div className="card" style={{ padding: "16px", color: "#111" }}>
          <b>Chưa kết nối ví.</b> Hãy bấm “Kết nối ví” để xem thống kê theo ví.
        </div>
      )}

      {!!account && !!errorMessage && (
        <div className="status-box error">
          Không tải được dữ liệu tài sản: {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: "center" }}>
          Đang tổng hợp dữ liệu Blockchain...
        </div>
      ) : (
        <div>
          {/* 1. KẾT QUẢ TỔNG QUAN */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "20px",
              marginBottom: "40px",
            }}
          >
            <div
              className="card"
              style={{
                padding: "20px",
                textAlign: "center",
                borderTop: "4px solid #61dafb",
                color: "#111",
              }}
            >
              <h3 style={{ margin: "0", color: "#aaa" }}>
                TỔNG SỐ TÀI SẢN (VÍ NÀY)
              </h3>
              <p
                style={{
                  fontSize: "36px",
                  fontWeight: "bold",
                  margin: "10px 0",
                }}
              >
                {stats.totalAssets}
              </p>
              <span style={{ fontSize: "12px", color: "#61dafb" }}>
                đang sở hữu
              </span>
            </div>

            <div
              className="card"
              style={{
                padding: "20px",
                textAlign: "center",
                borderTop: "4px solid #4CAF50",
                color: "#111",
              }}
            >
              <h3 style={{ margin: "0", color: "#aaa" }}>
                TỔNG GIÁ TRỊ (VÍ NÀY)
              </h3>
              <p
                style={{
                  fontSize: "36px",
                  fontWeight: "bold",
                  margin: "10px 0",
                  color: "#4CAF50",
                }}
              >
                {(Number(stats.totalValue) / 1000000000).toFixed(2)} tỷ
              </p>
              <span style={{ fontSize: "12px", color: "#888" }}>
                VNĐ (Ước tính)
              </span>
            </div>

            <div
              className="card"
              style={{
                padding: "20px",
                textAlign: "center",
                borderTop: "4px solid #FF9800",
                color: "#111",
              }}
            >
              <h3 style={{ margin: "0", color: "#aaa" }}>GIAO DỊCH</h3>
              <p
                style={{
                  fontSize: "36px",
                  fontWeight: "bold",
                  margin: "10px 0",
                  color: "#FF9800",
                }}
              >
                {stats.totalAssets > 0 ? "Hoạt động" : "Chưa có"}
              </p>
              <span style={{ fontSize: "12px", color: "#888" }}>
                trên mạng Cronos Testnet
              </span>
            </div>
          </div>

          {/* 2. BIỂU ĐỒ TRẠNG THÁI (Dạng Thanh Đơn Giản) */}
          <div className="card" style={{ padding: "20px", color: "#111" }}>
            <h3
              style={{
                borderBottom: "1px solid #444",
                paddingBottom: "10px",
                marginBottom: "20px",
              }}
            >
              📊 Phân Bổ Trạng Thái Tài Sản
            </h3>

            {stats.totalAssets === 0 ? (
              <p style={{ textAlign: "center", color: "#666" }}>
                Chưa có dữ liệu để hiển thị biểu đồ.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                }}
              >
                {stats.byStatus.map((count, index) => {
                  const percentage = (count / stats.totalAssets) * 100;
                  if (percentage === 0) return null; // Ẩn các mục 0%

                  return (
                    <div key={index}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "5px",
                          fontSize: "14px",
                        }}
                      >
                        <span>{getStatusLabel(index)}</span>
                        <span>
                          {count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "10px",
                          background: "#333",
                          borderRadius: "5px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${percentage}%`,
                            height: "100%",
                            background: getStatusColor(index),
                            transition: "width 1s ease-in-out",
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Chú thích màu */}
            <div
              style={{
                display: "flex",
                gap: "15px",
                marginTop: "20px",
                fontSize: "12px",
                justifyContent: "center",
              }}
            >
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  style={{ display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      background: getStatusColor(idx),
                      borderRadius: "2px",
                    }}
                  ></div>
                  <span style={{ color: "#aaa" }}>{getStatusLabel(idx)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
