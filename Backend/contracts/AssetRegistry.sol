// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title AssetRegistry - Sổ đăng ký tài sản theo mã (assetCode)
/// @notice Lưu thông tin tài sản theo `assetCode` và cho phép `verifier` duyệt (Verified/Rejected).
/// @dev Contract này độc lập với NFT (không phải ERC721). Trong dự án hiện tại, Frontend đang dùng `AssetNFT` là chính.
contract AssetRegistry {
    /// @notice Trạng thái xác thực của tài sản.
    enum Status { Pending, Verified, Rejected }

    /// @notice Thông tin tài sản gắn với `assetCode`.
    /// @dev `ipfsHash` thường là CID/đường dẫn trỏ tới metadata/hồ sơ trên IPFS (Pinata gateway).
    struct Asset {
        string ipfsHash;    // Hash lưu trữ hồ sơ trên IPFS (hoặc DB off-chain)
        string assetCode;   // Mã tài sản (ví dụ: ASSET-90821)
        address owner;      // Ví người sở hữu
        uint256 value;      // Giá trị khai báo
        Status status;      // Trạng thái xác thực
        uint256 timestamp;  // Thời gian tạo
    }

    // Mapping từ assetCode sang thông tin chi tiết
    /// @dev Mapping key là string; kiểm tra tồn tại dựa vào `timestamp` hoặc field trong struct.
    mapping(string => Asset) public assets;
    
    // Danh sách mã tài sản để duyệt
    /// @dev Do mapping không enumerate được, lưu thêm mảng để duyệt danh sách mã.
    string[] public assetCodes;

    /// @notice Ví kiểm định viên (verifier) có quyền duyệt tài sản.
    /// @dev Trong phiên bản này, người deploy contract sẽ là verifier.
    address public verifier; // Địa chỉ ví kiểm định viên

    /// @notice Event khi đăng ký tài sản.
    event AssetRegistered(string assetCode, address owner, string ipfsHash);
    /// @notice Event khi verifier cập nhật trạng thái xác thực.
    event AssetVerified(string assetCode, Status status);
    /// @notice Event khi chuyển nhượng (chỉ khi asset đã Verified).
    event AssetTransferred(string assetCode, address indexed from, address indexed to);

    /// @dev Chỉ verifier được gọi các hàm nhạy cảm.
    modifier onlyVerifier() {
        require(msg.sender == verifier, "Only verifier can perform this action");
        _;
    }

    /// @notice Khởi tạo contract.
    /// @dev `verifier` mặc định là `msg.sender` (deployer).
    constructor() {
        verifier = msg.sender; // Người deploy contract sẽ là kiểm định viên
    }

    /// @notice Đăng ký tài sản mới theo `assetCode`.
    /// @dev Luồng thường dùng:
    /// 1) FE upload hồ sơ -> nhận `_ipfsHash`
    /// 2) Gọi `registerAsset(_assetCode, _ipfsHash, _value)`
    /// 3) Asset được tạo ở trạng thái Pending, chờ verifier duyệt
    /// @param _assetCode Mã tài sản duy nhất
    /// @param _ipfsHash CID/hash trỏ hồ sơ trên IPFS
    /// @param _value Giá trị khai báo
    function registerAsset(string memory _assetCode, string memory _ipfsHash, uint256 _value) public {
        require(assets[_assetCode].timestamp == 0, "Asset already exists");

        assets[_assetCode] = Asset({
            ipfsHash: _ipfsHash,
            assetCode: _assetCode,
            owner: msg.sender,
            value: _value,
            status: Status.Pending,
            timestamp: block.timestamp
        });

        assetCodes.push(_assetCode);
        emit AssetRegistered(_assetCode, msg.sender, _ipfsHash);
    }

    /// @notice Xác thực tài sản (chỉ verifier).
    /// @dev Nếu `_isValid == true` -> Verified, ngược lại -> Rejected.
    /// @param _assetCode Mã tài sản
    /// @param _isValid Kết quả xác thực
    function verifyAsset(string memory _assetCode, bool _isValid) public onlyVerifier {
        require(assets[_assetCode].timestamp != 0, "Asset does not exist");
        
        if (_isValid) {
            assets[_assetCode].status = Status.Verified;
        } else {
            assets[_assetCode].status = Status.Rejected;
        }

        emit AssetVerified(_assetCode, assets[_assetCode].status);
    }

    /// @notice Lấy thông tin tài sản theo `assetCode`.
    /// @dev Trả tuple để dễ dùng ở UI/API mà không cần decode struct.
    /// @param _assetCode Mã tài sản
    /// @return ipfsHash CID/hash metadata/hồ sơ
    /// @return owner Chủ sở hữu hiện tại
    /// @return value Giá trị khai báo
    /// @return status Trạng thái xác thực
    /// @return timestamp Thời điểm đăng ký
    function getAsset(string memory _assetCode) public view returns (string memory, address, uint256, Status, uint256) {
        Asset memory a = assets[_assetCode];
        return (a.ipfsHash, a.owner, a.value, a.status, a.timestamp);
    }

    /// @notice Chuyển nhượng tài sản (chủ sở hữu thực hiện).
    /// @dev Chỉ cho phép khi asset đã Verified để tránh chuyển nhượng tài sản chưa được duyệt.
    /// @param _assetCode Mã tài sản
    /// @param _to Ví nhận quyền sở hữu mới
    function transferAsset(string memory _assetCode, address _to) public {
        require(assets[_assetCode].timestamp != 0, "Asset does not exist");
        require(assets[_assetCode].owner == msg.sender, "Only owner can transfer");
        require(assets[_assetCode].status == Status.Verified, "Asset must be verified first");
        require(_to != address(0), "Invalid address");

        address oldOwner = assets[_assetCode].owner;
        assets[_assetCode].owner = _to;

        emit AssetTransferred(_assetCode, oldOwner, _to);
    }
}
