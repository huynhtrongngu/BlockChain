import React from "react";
import { Link } from "react-router-dom";

const Navbar = ({ account, connectWallet, disconnectWallet }) => {
  return (
    <nav className="navbar">
      <div className="logo">ChainAsset</div>
      <div className="nav-links">
        <Link to="/">Trang Chủ</Link>
        <Link to="/register">Đăng Ký Tài Sản</Link>
        <Link to="/my-assets">Tài Sản Của Tôi</Link>
        <Link to="/profile">Hồ sơ</Link>
      </div>
      {!account ? (
        <button className="btn btn-primary" onClick={connectWallet}>
          Kết nối Ví
        </button>
      ) : (
        <div className="wallet-actions">
          <div className="wallet-info">
            <span className="dot"></span>
            {account.slice(0, 6)}...{account.slice(-4)}
          </div>
          <button className="btn btn-secondary" onClick={disconnectWallet}>
            Đăng xuất
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
