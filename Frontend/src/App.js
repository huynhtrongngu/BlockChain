import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AssetNFTABI from "./contracts/AssetNFT.json";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import RegisterAsset from "./components/RegisterAsset";
import MyAssets from "./components/MyAssets";
import Profile from "./components/Profile";
import "./App.css";

// ĐỊA CHỈ CONTRACT: Hãy thay thế bằng địa chỉ bạn copy từ Remix (ví dụ: 0xd914...)
const CONTRACT_ADDRESS =
  process.env.REACT_APP_CONTRACT_ADDRESS ||
  "0x1AD56FaA1aC5bB4382eB012bfC0ae7A19eDC5f87";

// Cronos Testnet chainId = 338 (0x152)
const EXPECTED_CHAIN_ID = BigInt(process.env.REACT_APP_CHAIN_ID || "338");

const CRONOS_TESTNET_PARAMS = {
  chainId: "0x152",
  chainName: "Cronos Testnet",
  nativeCurrency: { name: "tCRO", symbol: "tCRO", decimals: 18 },
  rpcUrls: ["https://evm-t3.cronos.org"],
  blockExplorerUrls: ["https://cronos.org/explorer/testnet3"],
};

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  const disconnectWallet = () => {
    setAccount(null);
    setContract(null);
  };

  const ensureExpectedNetwork = async (provider) => {
    const network = await provider.getNetwork();
    if (network.chainId === EXPECTED_CHAIN_ID) return;

    // Try switching MetaMask network
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CRONOS_TESTNET_PARAMS.chainId }],
      });
    } catch (err) {
      // If chain is not added yet
      if (
        err &&
        (err.code === 4902 || err?.data?.originalError?.code === 4902)
      ) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [CRONOS_TESTNET_PARAMS],
        });
      } else {
        throw err;
      }
    }
  };

  // 1. Kết nối ví Metamask
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        let provider = new ethers.BrowserProvider(window.ethereum);

        // Ensure correct network before using the contract
        await ensureExpectedNetwork(provider);
        // Recreate provider after switching network
        provider = new ethers.BrowserProvider(window.ethereum);

        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);

        // Verify contract exists on this network
        const code = await provider.getCode(CONTRACT_ADDRESS);
        if (!code || code === "0x") {
          throw new Error(
            `Không tìm thấy contract tại ${CONTRACT_ADDRESS} trên network hiện tại. Hãy kiểm tra chainId/địa chỉ contract.`,
          );
        }

        const assetContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          AssetNFTABI,
          signer,
        );
        setContract(assetContract);
      } catch (error) {
        console.error("Lỗi:", error);
        alert("Lỗi kết nối: " + (error?.shortMessage || error?.message));
      }
    } else {
      alert("Vui lòng cài đặt Metamask!");
    }
  };

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (!accounts || accounts.length === 0) {
        disconnectWallet();
        return;
      }
      // Khi user đổi account trong MetaMask, cập nhật lại state.
      // Tạm thời yêu cầu user bấm kết nối lại để chắc chắn signer/contract đồng bộ.
      disconnectWallet();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    const handleChainChanged = () => {
      // Chain changed: force app state reset to avoid stale provider/contract
      disconnectWallet();
    };

    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  return (
    <Router>
      <div className="app-container">
        <Navbar
          account={account}
          connectWallet={connectWallet}
          disconnectWallet={disconnectWallet}
        />

        <main className="main-content">
          <Routes>
            <Route
              path="/"
              element={<Home contract={contract} account={account} />}
            />
            <Route path="/profile" element={<Profile account={account} />} />
            <Route
              path="/register"
              element={<RegisterAsset contract={contract} account={account} />}
            />
            <Route
              path="/my-assets"
              element={<MyAssets contract={contract} account={account} />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
