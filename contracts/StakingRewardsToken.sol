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
 * Staking Rewards Token - ERC721 contract that gives the holder the right to define either the asset of the day on stakingrewards.com.
 */
contract StakingRewardsToken is ERC721Full, Ownable {
  using Strings for string;

  address proxyRegistryAddress;
  uint256 public currentTokenId;
  uint256 public activeTokenId;
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
    Proposal proposal;
    string metaHash;
    uint8 termsVersion;
    TokenType tokenType;
  }

  mapping (uint256 => Token) tokens;
  mapping (uint8 => string) terms;

  event MintedToken(uint256 indexed tokenId, address indexed tokenOwner, uint256 indexed startTime, uint256 endTime, TokenType tokenType);
  event NewProposalSubmitted(address indexed poolAddress, uint256 indexed tokenId, uint256 indexed startTime, uint256 endTime);
  event ProposalApproved(address indexed poolAddress, uint256 indexed tokenId, uint256 indexed startTime, uint256 endTime);
  event ActiveTokenUpdated(uint256 indexed tokenId);
  event PromotionResetted(uint256 indexed tokenId);

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
    require(_startTime > tokens[currentTokenId].validPeriod.endTime, "Token must have start time > most recent token's end time");
    if(tokens[currentTokenId].validPeriod.endTime != 0) {
      require(_startTime - tokens[currentTokenId].validPeriod.endTime < 7890000, "Token must have start time < 1 year after the most recent token's end time");
    }
    uint256 newTokenId = _getNextTokenId();
    _mint(_to, newTokenId);
    _incrementTokenId();

    if(_termsVersion > currentTermsVersion) {
      terms[_termsVersion] = _termsHash;
      currentTermsVersion = _termsVersion;
    }

    Token memory newToken = Token(
      Period(_startTime, _endTime),
      Proposal(address(0), address(0)),
      _metaHash,
      _termsVersion,
      _tokenType
    );
    tokens[newTokenId] = newToken;

    emit MintedToken(newTokenId, _to, _startTime, _endTime, _tokenType);
  }

  /**
    * @dev allows token holder to propose a pool to promote
    */
  function proposePromotedPool(uint256 _tokenId, address _poolAddress) public {
    require(msg.sender == ownerOf(_tokenId), "You must be the owner of a valid token to propose a promoted pool");
    require(tokens[currentTokenId].validPeriod.endTime > now, "Sorry, this token has expired");
    tokens[currentTokenId].proposal.proposedPool = _poolAddress;
    emit NewProposalSubmitted(_poolAddress, _tokenId, tokens[currentTokenId].validPeriod.startTime, tokens[currentTokenId].validPeriod.endTime);
  }

  /**
    * @dev allows the owner to approve a proposed pool
    */
  function approvePromotedPool(uint256 _tokenId, address _poolAddress) public onlyOwner {
    require(tokens[currentTokenId].proposal.proposedPool == _poolAddress, "Pool address must match pool proposed by token holder");
    require(tokens[currentTokenId].validPeriod.endTime > now, "This token has expired");
    tokens[currentTokenId].proposal.approvedPool = _poolAddress;
    emit ProposalApproved(_poolAddress, _tokenId, tokens[currentTokenId].validPeriod.startTime, tokens[currentTokenId].validPeriod.endTime);
  }

  /**
    * @dev resets the current promoted pool by setting the approvedPool address to 0
    */
  function resetPromotedPool(uint256 _tokenId) public onlyOwner {
    tokens[currentTokenId].proposal.approvedPool = address(0);
    emit PromotionResetted(_tokenId);
  }

  /**
    * @dev gets the current promoted pool
    * @return address pool address
    */
  function getPromotedPool() public view returns (address) {
    if(now >= tokens[activeTokenId].validPeriod.startTime) {
      return tokens[activeTokenId].proposal.approvedPool;
    } else {
      return address(0);
    }
  }

  /**
    * @dev sets the promoted pool returned by getPromotedPool by incrementing activeTokenId
    */
  function setPromotedPool() public {
    require(currentTokenId > activeTokenId, "Mint new token first.");
    require(now >= tokens[activeTokenId].validPeriod.endTime, "Current Promotion has not yet expired");
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

  /**
    * @dev base URI used by tokenURI
    */
  function baseTokenURI() public view returns (string memory) {
    return "https://gateway.pinata.cloud/ipfs/";
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
