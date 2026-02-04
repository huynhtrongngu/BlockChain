import axios from "axios";

// Default: use same-origin ("/api") so it works with CRA dev proxy and tunnels.
// Override by setting REACT_APP_API_BASE_URL when deploying separately.
const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "").trim();

function normalizeWalletAddress(address) {
  if (!address) return null;
  const normalized = String(address).trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalized)) return null;
  return normalized;
}

export async function getProfile(walletAddress) {
  const diaChiVi = normalizeWalletAddress(walletAddress);
  if (!diaChiVi) {
    throw new Error("Địa chỉ ví không hợp lệ");
  }
  const path = `/api/profile/${diaChiVi}`;
  const res = await axios.get(API_BASE_URL ? `${API_BASE_URL}${path}` : path);
  return res.data;
}

export async function upsertProfile(walletAddress, payload) {
  const diaChiVi = normalizeWalletAddress(walletAddress);
  if (!diaChiVi) {
    throw new Error("Địa chỉ ví không hợp lệ");
  }
  const path = `/api/profile/${diaChiVi}`;
  const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;
  const res = await axios.put(url, payload);
  return res.data;
}
