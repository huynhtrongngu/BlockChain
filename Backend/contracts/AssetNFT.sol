// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import chuẩn ERC-721 (NFT) từ OpenZeppelin
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AssetNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    // Định nghĩa các trạng thái tài sản
    enum AssetStatus { Active, Maintenance, Retired, Liquidated }

    // Lưu trạng thái của từng tài sản
    mapping(uint256 => AssetStatus) public assetStatuses;
    
    // Lưu giá trị định giá của từng tài sản (TokenId => Giá trị VNĐ)
    mapping(uint256 => uint256) public assetValues;
    
    // Lưu Mã tài sản (TokenId => AssetCode ví dụ "NHA-001")
    mapping(uint256 => string) public assetCodes;

    // Events phục vụ truy xuất nguồn gốc (History)
    event AssetMinted(uint256 indexed tokenId, address owner, string assetCode, uint256 value);
    event AssetStatusUpdated(uint256 indexed tokenId, AssetStatus status, address updatedBy, uint256 timestamp);
    event AssetTransferred(uint256 indexed tokenId, address from, address to, uint256 timestamp);

    constructor() ERC721("VietnamRealEstate", "VRE") Ownable(msg.sender) {}

    // Chức năng 1: Đăng ký tài sản mới (Mint NFT)
    // - to: Địa chỉ người nhận
    // - assetCode: Mã tài sản (VD: NHA-HN-01)
    // - tokenURI: Link IPFS chứa hồ sơ
    // - value: Giá trị tài sản
    function registerAsset(address to, string memory assetCode, string memory tokenURI, uint256 value)
        public
        // onlyOwner // Bỏ comment dòng này nếu chỉ muốn Admin được quyền tạo tài sản
        returns (uint256)
    {
        uint256 tokenId = _nextTokenId++;
        
        _mint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        assetValues[tokenId] = value;
        assetCodes[tokenId] = assetCode;
        assetStatuses[tokenId] = AssetStatus.Active; // Mặc định là "Đang sử dụng"

        emit AssetMinted(tokenId, to, assetCode, value);
        // Bắn event trạng thái ban đầu
        emit AssetStatusUpdated(tokenId, AssetStatus.Active, msg.sender, block.timestamp);
        
        return tokenId;
    }

    // Chức năng 2: Chuyển nhượng (Đơn giản hóa cho Frontend gọi)
    function transferAsset(address to, uint256 tokenId) public {
        // Hàm safeTransferFrom của OpenZeppelin tự kiểm tra msg.sender có phải là chủ sở hữu k
        safeTransferFrom(msg.sender, to, tokenId);
        
        // Bắn event chuyển nhượng kèm thời gian
        emit AssetTransferred(tokenId, msg.sender, to, block.timestamp);
    }

    // Chức năng 3: Cập nhật trạng thái tài sản
    function updateAssetStatus(uint256 tokenId, uint8 _statusIndex) public {
        require(ownerOf(tokenId) == msg.sender, "Khong phai chu so huu");
        require(_statusIndex <= 3, "Trang thai khong hop le");

        AssetStatus newStatus = AssetStatus(_statusIndex);
        assetStatuses[tokenId] = newStatus;

        emit AssetStatusUpdated(tokenId, newStatus, msg.sender, block.timestamp);
    }
    
    // Chức năng 4: Lấy danh sách tài sản của một người
    function getAssetsByOwner(address owner) public view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory result = new uint256[](balance);
        uint256 counter = 0;
        
        // Lưu ý: Cách duyệt này tốn gas, chỉ dùng cho demo hoặc danh sách nhỏ
        // Trong thực tế nên dùng The Graph để index dữ liệu
        for (uint256 i = 0; i < _nextTokenId; i++) {
            if (_ownerOf(i) == owner) {
                result[counter] = i;
                counter++;
            }
        }
        return result;
    }
}
