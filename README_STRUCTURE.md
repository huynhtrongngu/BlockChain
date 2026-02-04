# README cấu trúc dự án (chi tiết)

Tài liệu này mô tả **chức năng** và **nhiệm vụ** của từng **thư mục / file** trong dự án, kèm luồng dữ liệu chính.

> Gợi ý: Nếu bạn cần mô tả sâu về từng API/contract/luồng dữ liệu (kèm sơ đồ sequence), xem thêm: [docs/CHUC_NANG_CHI_TIET.md](docs/CHUC_NANG_CHI_TIET.md)

---

## 1) Tổng quan nhanh

Dự án gồm 3 lớp dữ liệu chính:

- **Off-chain (MongoDB)**: lưu _hồ sơ cá nhân_ theo địa chỉ ví.
- **IPFS/Pinata**: lưu _file hồ sơ_ và _metadata JSON_ chuẩn NFT.
- **On-chain (EVM/Cronos Testnet)**: lưu NFT ERC-721 đại diện tài sản (mã, giá trị, trạng thái, tokenURI).

Luồng tổng quát (khi đăng ký tài sản):

1. Frontend upload nhiều file lên Pinata → nhận các IPFS hash.
2. Frontend tạo metadata JSON (name/description/image/documents/attributes) và upload lên Pinata → nhận **metadata hash**.
3. Frontend gửi giao dịch `registerAsset(...)` lên smart contract → ghi `tokenURI = metadata hash` và các thông tin on-chain.

---

## 2) Thư mục gốc

### 2.1 README.md

- Tài liệu hướng dẫn chạy dự án, mô tả tính năng chính, cấu hình môi trường và deploy.

### 2.2 docs/

- Chứa tài liệu mô tả chi tiết chức năng/luồng dữ liệu.

File quan trọng:

- docs/CHUC_NANG_CHI_TIET.md: phân tích sâu theo module + có sơ đồ Mermaid.

---

## 3) Backend/

Backend là **REST API** cho hồ sơ cá nhân (MongoDB). Backend không gọi blockchain trực tiếp; toàn bộ tương tác blockchain diễn ra từ Frontend qua MetaMask/RPC.

### 3.1 Backend/package.json

- Khai báo dependencies và scripts.
- Scripts:
  - `npm run dev`: chạy bằng nodemon.
  - `npm start`: chạy bằng node.

Dependencies chính:

- `express`: web server.
- `cors`: cấu hình CORS.
- `dotenv`: đọc biến môi trường.
- `mongoose`: ORM/driver MongoDB.

### 3.2 Backend/.env.example

- Mẫu biến môi trường:
  - `MONGODB_URI`: URI kết nối Mongo.
  - `PORT`: port backend.
  - `CORS_ORIGIN`: origin frontend được phép gọi API.

### 3.3 Backend/src/

#### 3.3.1 Backend/src/index.js

**Vai trò**: entrypoint khởi chạy Express server, định nghĩa route API.

Chức năng chính:

- Cấu hình middleware: CORS, `express.json()`.
- Endpoint:
  - `GET /health`: kiểm tra server.
  - `GET /api/profile/:dia_chi_vi`: lấy profile theo ví.
  - `PUT /api/profile/:dia_chi_vi`: tạo/cập nhật profile (upsert).
- Helper `normalizeDiaChiVi()`:
  - Chuẩn hoá địa chỉ ví về lowercase và validate regex `0x` + 40 hex.

Luồng dữ liệu profile:

- Client (Frontend) → `/api/profile/<wallet>` → MongoDB (`nguoi_dung`) → trả JSON.

#### 3.3.2 Backend/src/db.js

**Vai trò**: module kết nối MongoDB.

- Export `connectDb(mongoUri)`:
  - validate `MONGODB_URI`.
  - `mongoose.connect()`.

#### 3.3.3 Backend/src/models/NguoiDung.js

**Vai trò**: Mongoose schema/model cho collection `nguoi_dung`.

Thiết kế:

- Định danh chính: `dia_chi_vi` (unique, lowercase).
- Không có password (định danh kiểu Web3).
- `email` unique + sparse (chỉ áp dụng unique khi có giá trị).

### 3.4 Backend/contracts/

Thư mục chứa **smart contract Solidity** (để deploy lên EVM).

#### 3.4.1 Backend/contracts/AssetNFT.sol

**Vai trò**: contract NFT chính (ERC-721) đại diện tài sản.

Chức năng (on-chain):

- `registerAsset(to, assetCode, tokenURI, value)`:
  - Mint NFT mới.
  - Lưu `assetCodes`, `assetValues`, `assetStatuses`.
  - Lưu `tokenURI` (trong dự án là IPFS hash metadata JSON).
  - Emit event để dựng lịch sử.
- `transferAsset(to, tokenId)`:
  - Chuyển nhượng token.
  - Emit `AssetTransferred`.
- `updateAssetStatus(tokenId, statusIndex)`:
  - Chủ sở hữu cập nhật trạng thái vòng đời.
  - Emit `AssetStatusUpdated`.
- `getAssetsByOwner(owner)`:
  - Trả danh sách tokenId thuộc owner (duyệt tuyến tính – phù hợp demo).

Dữ liệu on-chain:

- `assetCodes[tokenId]`: mã tài sản.
- `assetValues[tokenId]`: giá trị.
- `assetStatuses[tokenId]`: trạng thái (0..3).
- `tokenURI(tokenId)`: IPFS hash của metadata.

#### 3.4.2 Backend/contracts/AssetRegistry.sol

**Vai trò**: contract registry theo `assetCode` + cơ chế kiểm định viên.

Chức năng:

- `registerAsset(assetCode, ipfsHash, value)`.
- `verifyAsset(assetCode, isValid)` (onlyVerifier).
- `getAsset(assetCode)`.
- `transferAsset(assetCode, to)` (chỉ Verified mới được transfer).

Lưu ý: hiện tại Frontend chưa tích hợp/không gọi contract này.

---

## 4) Database/

### 4.1 Database/init_mongo.js

**Vai trò**: script chạy bằng `mongosh` để khởi tạo database.

Chức năng:

- Tạo DB `blockchain_assets`.
- Tạo/cập nhật validator cho collection `nguoi_dung`.
- Tạo index:
  - `dia_chi_vi` unique.
  - `email` unique + sparse.
- (Tuỳ chọn) seed dữ liệu mẫu.

### 4.2 Database/README.md

- Hướng dẫn cài MongoDB/mongosh trên Windows và chạy script init.

---

## 5) Frontend/

Frontend là SPA React. Nhiệm vụ chính:

- Kết nối MetaMask.
- Tạo instance contract (ethers v6) để đọc/ghi dữ liệu on-chain.
- Upload file + metadata lên Pinata/IPFS.
- Gọi Backend API để lưu hồ sơ cá nhân.

### 5.1 Frontend/package.json

- Dependencies:
  - `react`, `react-dom`, `react-scripts` (CRA).
  - `react-router-dom`: routing.
  - `ethers`: kết nối blockchain.
  - `axios`: gọi REST + fetch metadata IPFS.
- Có `proxy: http://localhost:5000` để khi dev gọi `/api/...` tự proxy sang Backend.

### 5.2 Frontend/.env.example

- Biến môi trường cho frontend:
  - `REACT_APP_CHAIN_ID`: chainId mong muốn (Cronos testnet = 338).
  - `REACT_APP_CONTRACT_ADDRESS`: địa chỉ contract AssetNFT.
  - `REACT_APP_API_BASE_URL` (tuỳ chọn): base URL backend khi deploy tách.

### 5.3 Frontend/public/

- `public/index.html`: HTML template gốc của CRA.

### 5.4 Frontend/build/

- Thư mục output sau khi `npm run build` (static assets production).
- Không phải nơi chỉnh code; chỉ để deploy.

### 5.5 Frontend/src/

#### 5.5.1 Frontend/src/index.js

- Entry React: render `<App />`.

#### 5.5.2 Frontend/src/App.js

**Vai trò**: “điểm trung tâm” quản lý kết nối ví và routing.

Chức năng:

- `connectWallet()`:
  - Tạo provider từ `window.ethereum`.
  - Ensure đúng network (switch/add Cronos testnet).
  - Lấy `signer` + `account`.
  - Kiểm tra contract có code ở địa chỉ cấu hình.
  - Khởi tạo `ethers.Contract` và lưu vào state.
- `disconnectWallet()`:
  - Reset `account` và `contract`.
- Listener MetaMask:
  - `accountsChanged` / `chainChanged` → reset state.

Routing:

- `/` → Home
- `/register` → RegisterAsset
- `/my-assets` → MyAssets
- `/profile` → Profile

#### 5.5.3 Frontend/src/App.css

- Styling chung cho layout/components.

#### 5.5.4 Frontend/src/contracts/

- Chứa ABI JSON để ethers tạo contract instance.

File:

- Frontend/src/contracts/AssetNFT.json: ABI của AssetNFT (được dùng trong `App.js`).

#### 5.5.5 Frontend/src/services/

File:

- Frontend/src/services/profileService.js

**Vai trò**: lớp service gọi backend profile.

- `getProfile(walletAddress)` → GET `/api/profile/:wallet`.
- `upsertProfile(walletAddress, payload)` → PUT `/api/profile/:wallet`.
- Có normalize địa chỉ ví (lowercase + regex) để tránh gọi sai.

#### 5.5.6 Frontend/src/components/

- Frontend/src/components/Navbar.js
  - Thanh điều hướng + nút kết nối ví/đăng xuất.

- Frontend/src/components/Home.js
  - Dashboard thống kê theo ví:
    - Gọi `getAssetsByOwner(account)`.
    - Đọc `assetValues(tokenId)` + `assetStatuses(tokenId)`.
    - Tổng hợp số lượng, tổng giá trị, phân bổ theo trạng thái.

- Frontend/src/components/RegisterAsset.js
  - Form đăng ký tài sản:
    - Upload nhiều file lên Pinata (`pinFileToIPFS`).
    - Tạo metadata JSON chuẩn NFT và upload (`pinJSONToIPFS`).
    - Gọi contract `registerAsset(account, code, metadataHash, value)`.

  Lưu ý: file hiện đang hardcode Pinata API key/secret (demo).

- Frontend/src/components/MyAssets.js
  - Ví tài sản:
    - Load danh sách tokenId bằng `getAssetsByOwner(account)`.
    - Với mỗi token: đọc `assetCodes`, `assetValues`, `tokenURI`, `assetStatuses`.
    - Fetch metadata JSON từ IPFS gateway để lấy `image`, `description`, `documents`, `Type`.
  - Chuyển nhượng:
    - Gọi `transferAsset(to, tokenId)`.
  - Cập nhật trạng thái:
    - Gọi `updateAssetStatus(tokenId, newStatusIndex)`.
  - Lịch sử:
    - Query event logs (`AssetMinted`, `AssetStatusUpdated`, `AssetTransferred`) theo chunks để tránh giới hạn RPC.

- Frontend/src/components/Profile.js
  - Trang hồ sơ cá nhân:
    - On load: `getProfile(account)`.
    - On submit: `upsertProfile(account, payload)`.

### 5.6 Frontend/README.md

- Tài liệu thiên về “thiết kế giao diện/UX” và định hướng mở rộng.

---

## 6) Bản đồ luồng dữ liệu theo tính năng

### 6.1 Đăng ký tài sản (NFT)

- UI (RegisterAsset) → Pinata (files) → Pinata (metadata JSON) → Smart contract `AssetNFT.registerAsset` → UI cập nhật trạng thái.

### 6.2 Xem tài sản & hồ sơ đính kèm

- UI (MyAssets) → Smart contract (đọc mappings + tokenURI) → IPFS gateway (fetch metadata JSON) → render.

### 6.3 Chuyển nhượng / đổi trạng thái

- UI (MyAssets) → Smart contract (tx) → event logs → UI reload.

### 6.4 Hồ sơ cá nhân

- UI (Profile) → Backend REST API → MongoDB → UI.

---

## 7) Gợi ý cải thiện (nếu làm bản nộp/production)

- Di chuyển upload Pinata sang Backend để tránh lộ API secret.
- Thêm xác thực cập nhật profile bằng chữ ký ví (ký message) để tránh sửa hồ sơ trái phép.
- Với lịch sử & tìm kiếm tài sản ở quy mô lớn: dùng indexer (The Graph / subgraph / custom indexer) thay vì quét logs và duyệt tuyến tính token.

---

## 8) Bảng nhiệm vụ theo file (tra cứu nhanh)

Phần này tóm tắt theo kiểu “mỗi file làm gì”, để bạn trình bày hoặc kiểm tra nhanh khi báo cáo.

### 8.1 Root

| Đường dẫn                  | Nhiệm vụ                                                | Dữ liệu vào/ra      |
| -------------------------- | ------------------------------------------------------- | ------------------- |
| README.md                  | Hướng dẫn chạy, cấu hình env, deploy, lưu ý Pinata      | Chủ yếu là tài liệu |
| README_STRUCTURE.md        | (File này) mô tả cấu trúc + chức năng từng file/thư mục | Chủ yếu là tài liệu |
| docs/CHUC_NANG_CHI_TIET.md | Phân tích sâu (sequence diagrams, luồng data)           | Chủ yếu là tài liệu |

### 8.2 Backend

| Đường dẫn                           | Nhiệm vụ                                   | Input           | Output                |
| ----------------------------------- | ------------------------------------------ | --------------- | --------------------- |
| Backend/src/index.js                | Express server + API profile               | HTTP request    | JSON response         |
| Backend/src/db.js                   | Kết nối MongoDB                            | `MONGODB_URI`   | `mongoose.connection` |
| Backend/src/models/NguoiDung.js     | Schema/model `nguoi_dung`                  | Document fields | Validation + indexes  |
| Backend/contracts/AssetNFT.sol      | ERC‑721 NFT cho tài sản                    | Tx gọi hàm      | State + events        |
| Backend/contracts/AssetRegistry.sol | Registry/verify theo assetCode (chưa dùng) | Tx gọi hàm      | State + events        |

### 8.3 Database

| Đường dẫn              | Nhiệm vụ                           | Input          | Output               |
| ---------------------- | ---------------------------------- | -------------- | -------------------- |
| Database/init_mongo.js | Tạo validator, index, seed MongoDB | mongosh        | collection + indexes |
| Database/README.md     | Hướng dẫn cài MongoDB/mongosh      | Người dùng đọc | -                    |

### 8.4 Frontend

| Đường dẫn                                | Nhiệm vụ                                    | Input                   | Output                      |
| ---------------------------------------- | ------------------------------------------- | ----------------------- | --------------------------- |
| Frontend/src/index.js                    | React entrypoint                            | DOM `#root`             | Render `<App/>`             |
| Frontend/src/App.js                      | Kết nối MetaMask + routing + tạo `contract` | `window.ethereum` + env | state `account`, `contract` |
| Frontend/src/components/Navbar.js        | Menu + connect/disconnect                   | `account` props         | UI                          |
| Frontend/src/components/Home.js          | Thống kê tài sản theo ví                    | `contract`, `account`   | UI stats                    |
| Frontend/src/components/RegisterAsset.js | Upload Pinata + mint NFT                    | form + files            | tx `registerAsset`          |
| Frontend/src/components/MyAssets.js      | Danh sách tài sản + transfer/status/history | `contract`, `account`   | UI + tx                     |
| Frontend/src/components/Profile.js       | Xem/lưu profile (off-chain)                 | `account`               | UI + API calls              |
| Frontend/src/services/profileService.js  | Wrapper axios cho API profile               | wallet + payload        | JSON profile                |
| Frontend/src/contracts/AssetNFT.json     | ABI để ethers gọi contract                  | -                       | -                           |

---

## 9) Đặc tả API Backend (chi tiết)

Base URL (local): `http://localhost:5000`

### 9.1 `GET /health`

Mục đích: kiểm tra server sống.

- Request: không có body
- Response `200`:

  ```json
  { "ok": true }
  ```

### 9.2 `GET /api/profile/:dia_chi_vi`

Mục đích: lấy hồ sơ cá nhân theo địa chỉ ví.

**Validation**:

- `dia_chi_vi` được chuẩn hoá lowercase và phải match regex `^0x[a-f0-9]{40}$`.

**Response**:

- `200`: trả document (các field có thể thiếu nếu chưa set)
- `400`: `{ "message": "Địa chỉ ví không hợp lệ" }`
- `404`: `{ "message": "Không tìm thấy" }`

**Ví dụ**:

`GET /api/profile/0x0000000000000000000000000000000000000001`

Response:

```json
{
  "_id": "...",
  "dia_chi_vi": "0x0000000000000000000000000000000000000001",
  "ho_ten": "Nguyễn Văn A",
  "email": "nguyen.a@example.com",
  "so_dien_thoai": "+84 912 345 678",
  "trang_thai": "hoat_dong",
  "created_at": "2026-02-05T00:00:00.000Z",
  "updated_at": "2026-02-05T00:00:00.000Z"
}
```

### 9.3 `PUT /api/profile/:dia_chi_vi`

Mục đích: tạo mới hoặc cập nhật profile theo ví (upsert).

**Body (JSON)**: chỉ các field sau được chấp nhận

- `ho_ten` (string)
- `email` (string)
- `so_dien_thoai` (string)
- `dia_chi_lien_he` (string)
- `avatar_url` (string)

**Quy ước xoá field**:

- Nếu gửi `""` hoặc `null` → backend `$unset` field.
- Nếu không gửi field (undefined) → backend giữ nguyên.

**Response**:

- `200`: trả document sau update.
- `400`: lỗi validation (ví sai format, email trùng unique, v.v.).

**Ví dụ**:

Request:

```http
PUT /api/profile/0xabc...123
Content-Type: application/json

{
  "ho_ten": "Nguyễn Văn B",
  "email": "b@example.com",
  "so_dien_thoai": "",
  "dia_chi_lien_he": "Hà Nội",
  "avatar_url": "https://..."
}
```

Ý nghĩa: set tên/email/địa chỉ/avatar, và xoá `so_dien_thoai`.

---

## 10) Đặc tả Smart Contract AssetNFT (chi tiết)

Contract dùng bởi frontend: `AssetNFT` (ERC‑721).

### 10.1 State (dữ liệu lưu on-chain)

- `assetCodes(tokenId) -> string`: mã tài sản (VD `ASSET-2024-001`).
- `assetValues(tokenId) -> uint256`: giá trị khai báo (VNĐ).
- `assetStatuses(tokenId) -> uint8`: 0..3 tương ứng trạng thái vòng đời.
- `tokenURI(tokenId) -> string`: trong dự án đang lưu **IPFS hash của metadata JSON**.

### 10.2 Hàm (ai gọi, tác động gì)

| Hàm                                             | Ai gọi         | Mục đích                   | Ghi/đọc state                       | Event                               |
| ----------------------------------------------- | -------------- | -------------------------- | ----------------------------------- | ----------------------------------- |
| `registerAsset(to, assetCode, tokenURI, value)` | Bất kỳ (demo)  | Mint NFT tài sản mới       | Ghi: mint + set mappings + tokenURI | `AssetMinted`, `AssetStatusUpdated` |
| `transferAsset(to, tokenId)`                    | Owner/approved | Chuyển nhượng token        | Ghi: owner token                    | `AssetTransferred`                  |
| `updateAssetStatus(tokenId, statusIndex)`       | **Chỉ owner**  | Đổi trạng thái vòng đời    | Ghi: `assetStatuses`                | `AssetStatusUpdated`                |
| `getAssetsByOwner(owner)`                       | Bất kỳ (view)  | Lấy danh sách token của ví | Đọc: duyệt owner                    | -                                   |

### 10.3 Events (phục vụ lịch sử)

Frontend dựng lịch sử bằng cách query logs:

- `AssetMinted(tokenId, owner, assetCode, value)`
- `AssetStatusUpdated(tokenId, status, updatedBy, timestamp)`
- `AssetTransferred(tokenId, from, to, timestamp)`

Trong MyAssets, lịch sử được tổng hợp theo:

- Mint: lấy timestamp từ block (nếu RPC cho phép), fallback text.
- Status/Transfer: lấy timestamp từ args của event.
- Sort theo `(blockNumber, logIndex)` để đúng thứ tự.

---

## 11) Schema metadata NFT (thứ nằm trên IPFS)

Metadata JSON được tạo trong `RegisterAsset.js` và upload bằng `pinJSONToIPFS`.

### 11.1 Cấu trúc JSON

```json
{
  "name": "ASSET-2024-001",
  "description": "Mô tả chi tiết...",
  "image": "https://gateway.pinata.cloud/ipfs/<imageHash>",
  "documents": [
    {
      "name": "so-do.pdf",
      "url": "https://gateway.pinata.cloud/ipfs/<docHash>",
      "type": "application/pdf"
    }
  ],
  "attributes": [
    { "trait_type": "Type", "value": "Bất động sản" },
    { "trait_type": "Created Date", "value": "2026-02-05" }
  ]
}
```

### 11.2 “tokenURI” thực tế trong dự án

- `tokenURI` được ghi vào chain là **metadata hash** (VD `Qm...`).
- Khi hiển thị danh sách, frontend fetch theo gateway:
  - `GET https://gateway.pinata.cloud/ipfs/${tokenURI}`

---

## 12) Luồng dữ liệu chi tiết theo use-case (mô tả từng bước)

### 12.1 Use-case: Kết nối ví + khởi tạo contract

File liên quan: `Frontend/src/App.js`

1. User bấm “Kết nối Ví”.
2. FE tạo `BrowserProvider(window.ethereum)`.
3. FE đọc chainId hiện tại. Nếu sai chainId kỳ vọng:
   - thử `wallet_switchEthereumChain`
   - nếu chưa add chain: `wallet_addEthereumChain`
4. FE lấy `signer` và `account`.
5. FE gọi `provider.getCode(CONTRACT_ADDRESS)` để chắc chắn địa chỉ contract tồn tại trên network.
6. FE tạo `new ethers.Contract(CONTRACT_ADDRESS, AssetNFTABI, signer)`.
7. `contract` được truyền xuống các page.

Điểm lỗi thường gặp:

- Không có MetaMask → không có `window.ethereum`.
- Sai chain → gọi contract sẽ fail.
- Sai địa chỉ contract → `getCode` trả `0x`.

### 12.2 Use-case: Đăng ký tài sản (upload + mint)

Files liên quan: `Frontend/src/components/RegisterAsset.js`, `Backend/contracts/AssetNFT.sol`

1. User nhập: loại, mã, mô tả, giá trị; chọn nhiều file.
2. FE upload từng file lên Pinata (`pinFileToIPFS`) → nhận hash.
3. FE tạo `documents[]` (tên file + URL gateway) và chọn file đầu làm `image`.
4. FE upload metadata JSON (`pinJSONToIPFS`) → nhận `metadataHash`.
5. FE gọi tx `registerAsset(account, assetCode, metadataHash, value)`.
6. Người dùng confirm tx trên MetaMask.
7. Chờ `tx.wait()` → thành công.

Kết quả lưu:

- On-chain: code/value/status + tokenURI=metadataHash.
- IPFS: file + metadata JSON.

### 12.3 Use-case: Xem danh sách tài sản

Files liên quan: `Frontend/src/components/MyAssets.js`

1. FE gọi `getAssetsByOwner(account)` → lấy mảng tokenId.
2. Với mỗi tokenId, FE đọc:
   - `assetCodes`, `assetValues`, `assetStatuses`, `tokenURI`.
3. FE fetch metadata JSON từ IPFS gateway để lấy `image/description/documents/Type`.
4. FE render card tài sản + nút hành động.

Điểm lỗi thường gặp:

- RPC giới hạn/timeout khi tokenIds nhiều.
- Gateway IPFS chậm hoặc metadata hash không tồn tại.

### 12.4 Use-case: Chuyển nhượng tài sản

Files liên quan: `Frontend/src/components/MyAssets.js`, `Backend/contracts/AssetNFT.sol`

1. User chọn tokenId và nhập ví nhận.
2. FE gọi tx `transferAsset(to, tokenId)`.
3. MetaMask confirm → tx mined → emit `AssetTransferred`.
4. FE reload danh sách.

### 12.5 Use-case: Cập nhật trạng thái vòng đời

Files liên quan: `Frontend/src/components/MyAssets.js`, `Backend/contracts/AssetNFT.sol`

1. User mở modal “Trạng thái” và chọn status mới (0..3).
2. FE gọi tx `updateAssetStatus(tokenId, newStatusIndex)`.
3. Contract require owner; nếu không phải owner → revert.
4. Tx mined → emit `AssetStatusUpdated` → FE reload.

### 12.6 Use-case: Xem lịch sử vòng đời (event logs)

Files liên quan: `Frontend/src/components/MyAssets.js`

1. FE lấy latest block.
2. FE quét log trong khoảng `LOOKBACK_BLOCKS` và chia chunk `MAX_BLOCK_RANGE` để tránh giới hạn RPC.
3. FE query 3 nhóm event theo tokenId.
4. FE chuẩn hoá thành timeline và render modal.

### 12.7 Use-case: Hồ sơ cá nhân (MongoDB)

Files liên quan: `Frontend/src/components/Profile.js`, `Frontend/src/services/profileService.js`, `Backend/src/index.js`

1. Khi có `account`, FE gọi `GET /api/profile/:wallet`.
2. Nếu 404 → cho phép user tạo mới.
3. Khi bấm “Lưu hồ sơ”, FE gọi `PUT /api/profile/:wallet`.
4. Backend upsert và trả document mới.

---

## 13) Checklist cấu hình (để chạy đúng theo luồng dữ liệu)

### 13.1 Backend

- Copy `Backend/.env.example` → `Backend/.env` và chỉnh nếu cần.
- MongoDB chạy local hoặc Atlas.
- Chạy: `cd Backend` → `npm install` → `npm run dev`

### 13.2 Database

- Chạy init: `cd Database` → `mongosh --file init_mongo.js`

### 13.3 Frontend

- Copy `Frontend/.env.example` → `Frontend/.env`.
- Set đúng:
  - `REACT_APP_CHAIN_ID=338`
  - `REACT_APP_CONTRACT_ADDRESS=0x...` (địa chỉ AssetNFT đã deploy)
- Chạy: `cd Frontend` → `npm install` → `npm start`

Nếu deploy tách FE/BE:

- Set `REACT_APP_API_BASE_URL` trỏ về backend, sau đó build lại.
