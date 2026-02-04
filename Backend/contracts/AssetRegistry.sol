// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AssetRegistry {
    enum Status { Pending, Verified, Rejected }

    struct Asset {
        string ipfsHash;    // Hash lưu trữ hồ sơ trên IPFS (hoặc DB off-chain)
        string assetCode;   // Mã tài sản (ví dụ: ASSET-90821)
        address owner;      // Ví người sở hữu
        uint256 value;      // Giá trị khai báo
        Status status;      // Trạng thái xác thực
        uint256 timestamp;  // Thời gian tạo
    }

    // Mapping từ assetCode sang thông tin chi tiết
    mapping(string => Asset) public assets;
    
    // Danh sách mã tài sản để duyệt
    string[] public assetCodes;

    address public verifier; // Địa chỉ ví kiểm định viên

    event AssetRegistered(string assetCode, address owner, string ipfsHash);
    event AssetVerified(string assetCode, Status status);
    event AssetTransferred(string assetCode, address indexed from, address indexed to);

    modifier onlyVerifier() {
        require(msg.sender == verifier, "Only verifier can perform this action");
        _;
    }

    constructor() {
        verifier = msg.sender; // Người deploy contract sẽ là kiểm định viên
    }

    // Chức năng 1: Đăng ký tài sản mới
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

    // Chức năng 2: Xác thực tài sản (Chỉ kiểm định viên)
    function verifyAsset(string memory _assetCode, bool _isValid) public onlyVerifier {
        require(assets[_assetCode].timestamp != 0, "Asset does not exist");
        
        if (_isValid) {
            assets[_assetCode].status = Status.Verified;
        } else {
            assets[_assetCode].status = Status.Rejected;
        }

        emit AssetVerified(_assetCode, assets[_assetCode].status);
    }

    // Chức năng 3: Lấy thông tin tài sản
    function getAsset(string memory _assetCode) public view returns (string memory, address, uint256, Status, uint256) {
        Asset memory a = assets[_assetCode];
        return (a.ipfsHash, a.owner, a.value, a.status, a.timestamp);
    }

    // Chức năng 4: Chuyển nhượng tài sản (Chủ sở hữu thực hiện)
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
