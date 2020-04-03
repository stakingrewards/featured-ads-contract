pragma solidity ^0.6.4;

import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721Full.sol";
import "../node_modules/@openzeppelin/contracts/ownership/Ownable.sol";
import "./Strings.sol";

contract OwnableDelegateProxy { }

contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}

/**
 * @title Promoted Pool
 * Promoted Pool - ERC721 contract that gives the holder the right to promote a pool on pools.fyi during the specified timeframe.
 */
contract PromotedPool is ERC721Full, Ownable {
  using Strings for string;

  address proxyRegistryAddress;
  uint256 public currentTokenId;
  uint256 public activeTokenId;
  uint8 public currentTermsVersion;

  struct PromotionPeriod {
    uint256 startTime;
    uint256 endTime;
  }

  struct PoolProposal {
    address proposedPool;
    address approvedPool;
  }

  mapping (uint256 => PromotionPeriod) promotionPeriods;
  mapping (uint256 => PoolProposal) proposedPools;
  mapping (uint256 => uint8) termsVersions;
  mapping (uint8 => string) terms;

  event MintedToken(uint256 indexed tokenId, address indexed tokenOwner, uint256 indexed startTime, uint256 endTime);
  event PromotedPoolProposed(address indexed poolAddress, uint256 indexed tokenId, uint256 indexed startTime, uint256 endTime);
  event PromotedPoolApproved(address indexed poolAddress, uint256 indexed tokenId, uint256 indexed startTime, uint256 endTime);
  event ActiveTokenUpdated(uint256 indexed tokenId);
  event PromotedPoolReset(uint256 indexed tokenId);

  constructor(string memory _name, string memory _symbol, address _proxyRegistryAddress) ERC721Full(_name, _symbol) public {
    proxyRegistryAddress = _proxyRegistryAddress;
  }

  /**
    * @dev Mints a token to an address with a tokenURI.
    * @param _to address of the future owner of the token
    * @param _startTime timestamp when the pool promoted by this token holder will begin displaying
    * @param _endTime timestamp when token expires
    * @param _termsHash hash of the terms and conditions associated with this token
    * @param _termsVersion version number of the terms and conditions
    */
  function mintTo(address _to, uint256 _startTime, uint256 _endTime, string memory _termsHash, uint8 _termsVersion) public onlyOwner {
    require(_startTime > now, "Token must have start time in the future.");
    require(_startTime > promotionPeriods[currentTokenId].endTime, "Token must have start time > most recent token's end time");
    if(promotionPeriods[currentTokenId].endTime != 0) {
      require(_startTime - promotionPeriods[currentTokenId].endTime < 7890000, "Token must have start time < 1 year after the most recent token's end time");
    }
    uint256 newTokenId = _getNextTokenId();
    _mint(_to, newTokenId);
    _incrementTokenId();
    promotionPeriods[newTokenId] = PromotionPeriod(_startTime, _endTime);
    proposedPools[newTokenId] = PoolProposal(address(0), address(0));
    if(_termsVersion > currentTermsVersion) {
      terms[_termsVersion] = _termsHash;
      currentTermsVersion = _termsVersion;
    }
    termsVersions[newTokenId] = _termsVersion;
    emit MintedToken(newTokenId, _to, _startTime, _endTime);
  }

  /**
    * @dev allows token holder to propose a pool to promote
    */
  function proposePromotedPool(uint256 _tokenId, address _poolAddress) public {
    require(msg.sender == ownerOf(_tokenId), "You must be the owner of a valid token to propose a promoted pool");
    require(promotionPeriods[_tokenId].endTime > now, "Sorry, this token has expired");
    proposedPools[_tokenId].proposedPool = _poolAddress;
    emit PromotedPoolProposed(_poolAddress, _tokenId, promotionPeriods[_tokenId].startTime, promotionPeriods[_tokenId].endTime);
  }

  /**
    * @dev allows the owner to approve a proposed pool
    */
  function approvePromotedPool(uint256 _tokenId, address _poolAddress) public onlyOwner {
    require(proposedPools[_tokenId].proposedPool == _poolAddress, "Pool address must match pool proposed by token holder");
    require(promotionPeriods[_tokenId].endTime > now, "This token has expired");
    proposedPools[_tokenId].approvedPool = _poolAddress;
    emit PromotedPoolApproved(_poolAddress, _tokenId, promotionPeriods[_tokenId].startTime, promotionPeriods[_tokenId].endTime);
  }

  /**
    * @dev resets the current promoted pool by setting the approvedPool address to 0
    */
  function resetPromotedPool(uint256 _tokenId) public onlyOwner {
    proposedPools[_tokenId].approvedPool = address(0);
    emit PromotedPoolReset(_tokenId);
  }

  /**
    * @dev gets the current promoted pool
    * @return address pool address
    */
  function getPromotedPool() public view returns (address) {
    if(now >= promotionPeriods[activeTokenId].startTime) {
      return proposedPools[activeTokenId].approvedPool;
    } else {
      return address(0);
    }
  }

  /**
    * @dev sets the promoted pool returned by getPromotedPool by incrementing activeTokenId
    */
  function setPromotedPool() public {
    require(currentTokenId > activeTokenId, "Mint new token first.");
    require(now >= promotionPeriods[activeTokenId].endTime, "Current Promotion has not yet expired");
    ++activeTokenId;
    emit ActiveTokenUpdated(activeTokenId);
  }

  /**
    * @dev gets the hash for the terms and conditions for a given terms version
    * @return string terms hash
    */
  function getTermsHash(uint8 _termsVersion) public view returns(string memory) {
    return terms[_termsVersion];
  }

  /**
    * @dev gets the version of the terms and conditions for a given token ID
    * @return uint8 terms version
    */
  function getTermsVersion(uint256 _tokenId) public view returns(uint8) {
    return termsVersions[_tokenId];
  }

  /**
    * @dev calculates the next token ID based on value of currentTokenId
    * @return uint256 for the next token ID
    */
  function _getNextTokenId() private view returns (uint256) {
    return currentTokenId.add(1);
  }

  /**
    * @dev increments the value of currentTokenId
    */
  function _incrementTokenId() private  {
    currentTokenId++;
  }

  /**
    * @dev base URI used by tokenURI
    */
  function baseTokenURI() public view returns (string memory) {
    return "https://nft.blocklytics.org/";
  }

  /**
    * @dev returns metadata URI for token
    * @return string metadata URI
    */
  function tokenURI(uint256 _tokenId) external view returns (string memory) {
    return Strings.strConcat(
        baseTokenURI(),
        "api/promoted-pools/",
        Strings.uint2str(_tokenId)
    );
  }

  /**
   * Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable gas-less listings.
   */
  function isApprovedForAll(
    address owner,
    address operator
  )
    public
    view
    returns (bool)
  {
    // Whitelist OpenSea proxy contract for easy trading.
    ProxyRegistry proxyRegistry = ProxyRegistry(proxyRegistryAddress);
    if (address(proxyRegistry.proxies(owner)) == operator) {
        return true;
    }

    return super.isApprovedForAll(owner, operator);
  }
}
