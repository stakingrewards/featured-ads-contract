pragma solidity ^0.5.1;

import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721Full.sol";
import "../node_modules/@openzeppelin/contracts/ownership/Ownable.sol";
import "./Strings.sol";

contract OwnableDelegateProxy { }

contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}

/**
 * @title Staking Rewards Token
 * Staking Rewards Token - ERC721 contract that gives the holder the right to define a featured ad at stakingrewards.com.
 */
contract StakingRewardsToken is ERC721Full, Ownable {
  using Strings for string;

  address proxyRegistryAddress;

  uint256 public currentTokenId;

  uint256 public currentAssetTokenId;
  uint256 public currentProviderTokenId;
  uint256 public currentArticleTokenId;

  uint8 public currentTermsVersion;

  enum TokenType { Asset, Provider, Article }

  struct Period {
    uint256 startTime;
    uint256 endTime;
  }

  struct Proposal {
    address proposedPool;
    address approvedPool;
  }

  struct Token {
    Period validPeriod;
    string claimedAdSlug;
    string metaHash;
    uint8 termsVersion;
    TokenType tokenType;
  }

  mapping (uint256 => Token) tokens;
  mapping (uint8 => string) terms;

  event MintedToken(uint256 indexed tokenId, address indexed tokenOwner, uint256 indexed startTime, uint256 endTime, TokenType tokenType);
  event NewAdClaimed(string indexed slug, uint256 indexed tokenId, TokenType indexed tokenType, uint256 startTime, uint256 endTime);
  event AdResetted(uint256 indexed tokenId);
  event CurrentAdUpdated(
    uint256 indexed currentAssetTokenId,
    uint256 indexed currentProviderTokenId,
    uint256 indexed currentArticleTokenId
  );

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
    * @param _metaHash hash of the metadata associated with this token
    * @param _tokenType type of the new token
    */
  function mintTo(
    address _to,
    uint256 _startTime,
    uint256 _endTime,
    string memory _termsHash,
    uint8 _termsVersion,
    string memory _metaHash,
    TokenType _tokenType
  ) public onlyOwner {
    require(_startTime > now, "Token must have start time in the future.");

    string memory tokenBeforeCurrentErrorMsg = "Token must have start time > most recent token's end time";
    if(_tokenType == TokenType.Asset) {
      require(_startTime > tokens[currentAssetTokenId].validPeriod.endTime, tokenBeforeCurrentErrorMsg);
    } else if (_tokenType == TokenType.Provider) {
      require(_startTime > tokens[currentProviderTokenId].validPeriod.endTime, tokenBeforeCurrentErrorMsg);
    } else if (_tokenType == TokenType.Article) {
      require(_startTime > tokens[currentArticleTokenId].validPeriod.endTime, tokenBeforeCurrentErrorMsg);
    }

    uint256 newTokenId = _getNextTokenId();
    _mint(_to, newTokenId);
    _incrementTokenId();

    if(_termsVersion > currentTermsVersion) {
      terms[_termsVersion] = _termsHash;
      currentTermsVersion = _termsVersion;
    }

    tokens[newTokenId] = Token(
      Period(_startTime, _endTime),
      "",
      _metaHash,
      _termsVersion,
      _tokenType
    );

    emit MintedToken(newTokenId, _to, _startTime, _endTime, _tokenType);
    updateAds();
  }

  /**
    * @dev allows token holder to claim an ad
    */
  function claimAd(uint256 _tokenId, string memory _slug) public {
    require(msg.sender == ownerOf(_tokenId), "You must be the owner of a valid token to claim your featured ad");
    require(!_isExpired(_tokenId), "Sorry, this token has expired");

    tokens[_tokenId].claimedAdSlug = _slug;
    emit NewAdClaimed(_slug, _tokenId, tokens[_tokenId].tokenType, tokens[_tokenId].validPeriod.startTime, tokens[_tokenId].validPeriod.endTime);
  }

  /**
    * @dev resets the current promoted pool by setting the approvedPool address to 0
    */
  function resetClaimedAd(uint256 _tokenId) public onlyOwner {
    tokens[_tokenId].claimedAdSlug = "";
    emit AdResetted(_tokenId);
  }

  /**
    * @dev gets the active ad
    * @return slug for ad type
    */
  function getCurrentAd(TokenType _tokenType) public view returns (string memory) {
    if (_tokenType == TokenType.Asset) {
      return _getCurrentSlug(currentAssetTokenId);
    } else if (_tokenType == TokenType.Provider) {
      return _getCurrentSlug(currentProviderTokenId);
    } else if (_tokenType == TokenType.Article) {
      return _getCurrentSlug(currentArticleTokenId);
    }
    return "";
  }

  /**
    * @dev updates the current ads
    */
  function updateAds() public {
    if (_isExpired(currentAssetTokenId) || currentAssetTokenId == 0) {
      currentAssetTokenId = _getNextClaimedTokenId(currentAssetTokenId, TokenType.Asset);
    }
    if (_isExpired(currentProviderTokenId) || currentProviderTokenId == 0) {
      currentProviderTokenId = _getNextClaimedTokenId(currentProviderTokenId, TokenType.Provider);
    }
    if (_isExpired(currentArticleTokenId) || currentArticleTokenId == 0) {
      currentArticleTokenId = _getNextClaimedTokenId(currentArticleTokenId, TokenType.Article);
    }

    emit CurrentAdUpdated(currentAssetTokenId, currentProviderTokenId, currentArticleTokenId);
  }

  /**
    * @dev gets the tokenType
    * @return TokenType
    */
  function getTokenType(uint256 _tokenId) public view returns(TokenType) {
    return tokens[_tokenId].tokenType;
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
    return tokens[_tokenId].termsVersion;
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

  function _isExpired(uint256 _id) private view returns (bool) {
    return tokens[_id].validPeriod.endTime < now;
  }

  function _hasStarted(uint256 _id) private view returns (bool) {
    return tokens[_id].validPeriod.startTime <= now;
  }

  function _getCurrentSlug(uint256 _id) private view returns (string memory) {
    require (_hasStarted(_id) && !_isExpired(_id) && tokens[_id].validPeriod.startTime != 0, "no valid token found");
    return tokens[_id].claimedAdSlug;
  }

  function _getNextClaimedTokenId(uint256 _id, TokenType _tokenType) private view returns (uint256) {
    for (uint256 i = _id + 1; i <= currentTokenId; i++) {
      if (tokens[i].tokenType == _tokenType && !_isExpired(i)) {
        return i;
      }
    }
    return _id;
  }

  /**
    * @dev base URI used by tokenURI
    */
  function baseTokenURI() public view returns (string memory) {
    return "https://ipfs.infura.io:5001/api/v0/cat?arg=";
  }

  /**
    * @dev returns metadata URI for token
    * @return string metadata URI
    */
  function tokenURI(uint256 _tokenId) external view returns (string memory) {
    return Strings.strConcat(
        baseTokenURI(),
        tokens[_tokenId].metaHash
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
