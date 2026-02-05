// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import chuẩn ERC-721 (NFT) từ OpenZeppelin
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title AssetNFT - NFT đại diện tài sản (ERC-721)
/// @notice Contract demo để đăng ký tài sản bằng NFT, lưu hồ sơ ở IPFS (tokenURI), và truy xuất lịch sử qua event logs.
/// @dev Frontend gọi các hàm view để đọc state và gọi các hàm write để tạo/chuyển/đổi trạng thái.
contract AssetNFT is ERC721URIStorage, Ownable {
    /// @dev TokenId kế tiếp sẽ được mint. TokenId bắt đầu từ 0.
    uint256 private _nextTokenId;

    /// @notice Trạng thái vòng đời tài sản.
    /// @dev FE map index -> text: 0 Active, 1 Maintenance, 2 Retired, 3 Liquidated.
    enum AssetStatus { Active, Maintenance, Retired, Liquidated }

    /// @notice Trạng thái của tokenId.
    /// @dev Lưu on-chain để thống kê và kiểm soát vòng đời.
    mapping(uint256 => AssetStatus) public assetStatuses;
    
    /// @notice Giá trị khai báo/định giá của tài sản theo VNĐ.
    /// @dev Đơn vị do hệ thống quy ước; contract không áp đặt decimal hay kiểm toán.
    mapping(uint256 => uint256) public assetValues;
    
    /// @notice Mã tài sản theo tokenId (VD: "ASSET-2024-001").
    mapping(uint256 => string) public assetCodes;

    /// @notice Event tạo tài sản (mint).
    /// @dev Dùng để dựng lịch sử trong FE qua query logs.
    event AssetMinted(uint256 indexed tokenId, address owner, string assetCode, uint256 value);

    /// @notice Event cập nhật trạng thái vòng đời.
    /// @dev `timestamp` dùng block.timestamp lúc update.
    event AssetStatusUpdated(uint256 indexed tokenId, AssetStatus status, address updatedBy, uint256 timestamp);

    /// @notice Event chuyển nhượng quyền sở hữu.
    /// @dev FE dùng event này để dựng timeline chuyển quyền.
    event AssetTransferred(uint256 indexed tokenId, address from, address to, uint256 timestamp);

    constructor() ERC721("VietnamRealEstate", "VRE") Ownable(msg.sender) {}

    /// @notice Đăng ký tài sản mới (mint NFT).
    /// @dev Luồng dữ liệu điển hình:
    /// 1) FE upload hồ sơ lên IPFS/Pinata -> nhận `metadataHash`
    /// 2) FE gọi `registerAsset(to, assetCode, metadataHash, value)`
    /// 3) Contract mint token và set `tokenURI(tokenId) = metadataHash`
    ///
    /// @param to Địa chỉ nhận token (thường là ví người dùng đang kết nối)
    /// @param assetCode Mã tài sản (chuỗi do hệ thống đặt)
    /// @param tokenURI Trong dự án này thường là IPFS hash của metadata JSON
    /// @param value Giá trị khai báo (VNĐ)
    /// @return tokenId TokenId vừa mint
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

    /// @notice Chuyển nhượng tài sản (transfer NFT).
    /// @dev Wrapper đơn giản để FE gọi thay vì dùng thẳng `safeTransferFrom`.
    ///      OpenZeppelin sẽ kiểm tra quyền: msg.sender phải là owner hoặc được approve.
    /// @param to Ví nhận token
    /// @param tokenId Token cần chuyển
    function transferAsset(address to, uint256 tokenId) public {
        // Hàm safeTransferFrom của OpenZeppelin tự kiểm tra msg.sender có phải là chủ sở hữu k
        safeTransferFrom(msg.sender, to, tokenId);
        
        // Bắn event chuyển nhượng kèm thời gian
        emit AssetTransferred(tokenId, msg.sender, to, block.timestamp);
    }

    /// @notice Cập nhật trạng thái vòng đời tài sản.
    /// @dev Chỉ chủ sở hữu token được phép cập nhật.
    /// @param tokenId Token cần đổi trạng thái
    /// @param _statusIndex Index trạng thái (0..3)
    function updateAssetStatus(uint256 tokenId, uint8 _statusIndex) public {
        require(ownerOf(tokenId) == msg.sender, "Khong phai chu so huu");
        require(_statusIndex <= 3, "Trang thai khong hop le");

        AssetStatus newStatus = AssetStatus(_statusIndex);
        assetStatuses[tokenId] = newStatus;

        emit AssetStatusUpdated(tokenId, newStatus, msg.sender, block.timestamp);
    }
    
    /// @notice Lấy danh sách tokenId đang thuộc về một owner.
    /// @dev Hàm view, FE gọi bằng eth_call (không tốn gas cho người dùng).
    ///      Nhưng RPC vẫn phải thực thi tính toán; token nhiều sẽ chậm.
    ///      Cách làm demo: duyệt tuyến tính 0.._nextTokenId-1.
    /// @param owner Địa chỉ ví cần truy vấn
    /// @return result Mảng tokenId thuộc owner
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
