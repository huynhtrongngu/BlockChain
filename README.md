# Ứng dụng đăng ký & chuyển nhượng tài sản bằng NFT (ERC-721)

Dự án minh hoạ việc dùng **NFT Smart Contract** để đại diện tài sản, lưu **metadata trên IPFS/Pinata**, hỗ trợ **chuyển nhượng**, **quản lý vòng đời (status)** và **lịch sử/provenance** (dựa trên event). Phần “hồ sơ cá nhân” được lưu **off-chain** bằng MongoDB và định danh bằng **địa chỉ ví**.

## Tính năng chính

- Kết nối ví MetaMask (Web3 “login”)
- Đăng ký tài sản → mint NFT (ERC-721) trên **Cronos Testnet**
- Upload nhiều file hồ sơ lên IPFS/Pinata, tạo metadata JSON chuẩn NFT
- Ví tài sản: xem danh sách NFT theo chủ sở hữu
- Chuyển nhượng (transfer) + cập nhật trạng thái tài sản
- Xem lịch sử tài sản (mint/transfer/status) bằng cách query event logs
- Hồ sơ cá nhân (MongoDB): xem/cập nhật theo địa chỉ ví

## Công nghệ

- Smart contract: Solidity, OpenZeppelin ERC721URIStorage
- Frontend: React (CRA), ethers v6, axios, react-router
- Backend: Node.js + Express + Mongoose
- Database: MongoDB
- Storage: IPFS qua Pinata

## Cấu trúc thư mục

- Backend/: API server + smart contracts
- Frontend/: React app
- Database/: script khởi tạo MongoDB (validator + indexes + seed)

## Yêu cầu

- Node.js 18+ (khuyến nghị LTS), npm
- MongoDB Community Server + mongosh (để chạy script init)
- MetaMask
- Cronos Testnet (chainId 338 / 0x152) + một ít tCRO test để trả phí gas

## Thiết lập nhanh (Local)

### 1) Khởi tạo MongoDB

Xem hướng dẫn chi tiết tại Database/README.md.

Chạy script khởi tạo (tạo collection `nguoi_dung`, index, seed mẫu):

```powershell
cd Database
mongosh --file init_mongo.js
```

Mặc định dùng DB: `blockchain_assets`.

### 2) Chạy Backend

Tạo file env:

- Copy Backend/.env.example → Backend/.env

Sau đó chạy:

```powershell
cd Backend
npm install
npm run dev
```

Kiểm tra:

- `GET http://localhost:5000/health` → `{ ok: true }`

### 3) Chạy Frontend

Tạo file env:

- Copy Frontend/.env.example → Frontend/.env

Chạy:

```powershell
cd Frontend
npm install
npm start
```

Mở: `http://localhost:3000`

Lưu ý: Frontend đã cấu hình CRA dev proxy sang Backend (`http://localhost:5000`). Vì vậy các call profile dùng đường dẫn `/api/...` sẽ chạy ổn ở local và khi dùng tunnel (tránh hardcode localhost).

## Deploy contract & cấu hình địa chỉ

### 1) Deploy

Contract chính: Backend/contracts/AssetNFT.sol

Bạn có thể deploy bằng Remix lên **Cronos Testnet**. Sau khi deploy xong, lấy **contract address**.

### 2) Cấu hình Frontend

Sửa Frontend/.env:

```dotenv
REACT_APP_CHAIN_ID=338
REACT_APP_CONTRACT_ADDRESS=0x... # địa chỉ contract AssetNFT bạn vừa deploy
```

Frontend sẽ cố gắng chuyển network trong MetaMask sang Cronos Testnet và kiểm tra có code tại địa chỉ contract trước khi gọi ABI.

## Cấu hình biến môi trường (ENV)

### Backend (Backend/.env)

Tham khảo mẫu tại Backend/.env.example.

- `MONGODB_URI`: Mongo connection string (mặc định `mongodb://127.0.0.1:27017/blockchain_assets`)
- `PORT`: port backend (mặc định `5000`)
- `CORS_ORIGIN`: origin được phép gọi API (dev thường là `http://localhost:3000`). Nếu deploy production, nên set đúng domain frontend.

### Frontend (Frontend/.env)

Tham khảo mẫu tại Frontend/.env.example.

- `REACT_APP_CHAIN_ID`: chainId EVM (Cronos Testnet = `338`)
- `REACT_APP_CONTRACT_ADDRESS`: địa chỉ contract `AssetNFT`
- `REACT_APP_API_BASE_URL` (tuỳ chọn): base URL của backend API khi FE/BE deploy tách rời.

Lưu ý quan trọng: với CRA, các biến `REACT_APP_*` được “đóng gói” tại **thời điểm build**. Nếu bạn đổi backend URL sau khi đã build, bạn phải build lại frontend.

## Deploy production (đầy đủ)

Bạn có 2 cách deploy phổ biến:

### Cách 1: Deploy tách rời (Frontend static + Backend API riêng)

Phù hợp khi:

- Frontend deploy trên Vercel/Netlify/GitHub Pages/S3
- Backend deploy trên VPS/Render/Fly.io…

Các bước:

#### 1) Deploy Backend

- Chuẩn bị MongoDB (Atlas hoặc Mongo cài trên VPS).
- Tạo `Backend/.env` trên server, ví dụ:

```dotenv
MONGODB_URI=mongodb+srv://.../blockchain_assets
PORT=5000
CORS_ORIGIN=https://your-frontend.example.com
```

- Cài & chạy:

```bash
cd Backend
npm install --omit=dev
npm start
```

- Khuyến nghị production: dùng process manager như PM2 (để tự restart/log):

```bash
npm i -g pm2
pm2 start src/index.js --name asset-nft-backend
pm2 save
```

#### 2) Build & Deploy Frontend

Khi deploy tách rời, bạn cần set `REACT_APP_API_BASE_URL` trỏ về backend:

```bash
cd Frontend
set REACT_APP_API_BASE_URL=https://your-backend.example.com
npm ci
npm run build
```

Upload thư mục `Frontend/build/` lên host static.

Ghi chú HTTPS: nếu frontend chạy HTTPS mà backend chạy HTTP sẽ bị chặn (Mixed Content). Vì vậy backend production nên có HTTPS (qua reverse proxy như Nginx/Caddy hoặc nền tảng deploy).

### Cách 2: Cùng domain (Nginx serve Frontend + proxy /api → Backend)

Phù hợp khi bạn có 1 VPS và muốn:

- Frontend và Backend cùng domain
- Frontend gọi API bằng `/api` (không cần `REACT_APP_API_BASE_URL`)

Sơ đồ:

- Nginx: serve static Frontend + proxy `/api` sang Node backend
- Node backend: chạy nội bộ (ví dụ `127.0.0.1:5000`)

Build frontend trên server (hoặc CI) rồi copy `build/` vào thư mục Nginx:

```bash
cd Frontend
npm ci
npm run build
```

Ví dụ cấu hình Nginx (mang tính tham khảo):

```nginx
server {

  listen 80;
  server_name your-domain.example.com;

  root /var/www/asset-nft-frontend;  # chứa nội dung build của CRA
  index index.html;

  # SPA routing
  location / {
    try_files $uri /index.html;
  }

  # API proxy
  location /api/ {
    proxy_pass http://127.0.0.1:5000/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Trong trường hợp này:

- Frontend giữ cách gọi API theo đường dẫn `/api/...`
- Backend nên set `CORS_ORIGIN` về đúng domain (hoặc để cùng-origin thì CORS ít vấn đề hơn)

## Sử dụng devtunnel / truy cập từ máy khác

- Dev (CRA proxy): chỉ hoạt động khi chạy `npm start` (dev server), không áp dụng cho production build.
- Nếu bạn mở frontend qua tunnel/remote:
  - Cách nhanh: set `REACT_APP_API_BASE_URL` bằng URL tunnel của backend rồi chạy lại `npm start` hoặc build lại.
  - Tránh hardcode `http://localhost:5000` trong code frontend để không bị lỗi khi truy cập từ máy khác.

## Checklist trước khi nộp/đóng gói

- Đảm bảo không commit `**/node_modules/` và `Frontend/build/`
- Không để Pinata API key/secret thật trong Frontend (rotate key nếu đã lộ)
- Xác nhận `REACT_APP_CONTRACT_ADDRESS` đúng Cronos Testnet và contract đã deploy
- Backend `CORS_ORIGIN` đúng domain frontend (production)
- (Tuỳ chọn) Thêm xác thực update profile bằng chữ ký ví (SIWE-lite)

## Lưu ý quan trọng về Pinata / IPFS

Hiện tại Frontend/src/components/RegisterAsset.js đang dùng **Pinata API key/secret trực tiếp trong Frontend** (chỉ phù hợp demo).

Khuyến nghị:

- Không commit key thật lên GitHub.
- Xoay (rotate) key nếu đã lộ.
- Tốt nhất: chuyển logic upload Pinata sang Backend (server-side) hoặc dùng JWT/temporary token theo cơ chế an toàn.

## Troubleshooting

- Thấy “0 tài sản” hoặc lỗi decode: kiểm tra MetaMask đang ở **Cronos Testnet** và `REACT_APP_CONTRACT_ADDRESS` đúng network.
- Lỗi `eth_getLogs maximum [from,to] blocks distance`: RPC giới hạn range query logs; dự án đã query theo chunks, nhưng nếu mint quá lâu trước đó có thể cần tăng lookback.
- Cập nhật hồ sơ không chạy khi truy cập từ máy khác/tunnel: đảm bảo Frontend gọi API theo đường dẫn `/api` (same-origin) hoặc set `REACT_APP_API_BASE_URL` khi deploy tách rời.

## Ghi chú

- “Đăng xuất” chỉ reset trạng thái kết nối trong app; không thể ép MetaMask disconnect hoàn toàn bằng code.
- Dự án mang tính học tập/demo; nếu dùng thực tế cần thêm xác thực cập nhật profile bằng chữ ký (SIWE-lite) và harden backend.
