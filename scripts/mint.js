const HDWalletProvider = require("@truffle/hdwallet-provider")
const web3 = require('web3')
const axios = require('axios')
require('dotenv').config();

const PRIVATE_KEY = process.env.PRIVATE_KEY
const INFURA_KEY = process.env.INFURA_KEY
const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS
const OWNER_ADDRESS = process.env.OWNER_ADDRESS
const NETWORK = process.env.NETWORK
const TERMS_HASH = process.env.TERMS_HASH
const TERMS_VERSION = 1
const NUM_PROMOTED_POOLS = 1
const TOKEN_VALID_FOR_DAYS = 5
const FIRST_TOKEN_START_TIME = "2020-04-13T00:00:00+0000"

if (!PRIVATE_KEY || !INFURA_KEY || !OWNER_ADDRESS || !NETWORK) {
    console.error("Please set a PRIVATE_KEY, infura key, owner, network, and contract address.")
    return
}

const BASE_URL = "https://nft.stakingrewards.com/api/stakingrewards-token/"
const STORAGE_BUCKET_URL = "https://storage.googleapis.com/stakingrewards/stakingrewards-token/meta/"
const TOKEN_VALID_FOR_SECONDS = TOKEN_VALID_FOR_DAYS * 24 * 60 * 60;
const TOKEN_TIME_BETWEEN_SECONDS = 2 * 24 * 60 * 60;

const http = axios.create({
    baseURL: BASE_URL
});

const NFT_ABI = [{
    "constant": false,
    "inputs": [{
            "internalType": "address",
            "name": "_to",
            "type": "address"
        },
        {
            "internalType": "uint256",
            "name": "_startTime",
            "type": "uint256"
        },
        {
            "internalType": "uint256",
            "name": "_endTime",
            "type": "uint256"
        },
        {
            "internalType": "string",
            "name": "_termsHash",
            "type": "string"
        },
        {
            "internalType": "uint8",
            "name": "_termsVersion",
            "type": "uint8"
        }
    ],
    "name": "mintTo",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
}, {
    "constant": true,
    "inputs": [],
    "name": "currentTokenId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }, {
    "constant": true,
    "inputs": [{
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
    }],
    "name": "tokenURI",
    "outputs": [{
        "internalType": "string",
        "name": "",
        "type": "string"
    }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
}]

async function createTokenMetadata(tokenId, startTime, endTime) {
    const startDate = new Date(startTime * 1000);
    const endDate = new Date(endTime * 1000);
    let metadata = {
        "name": "Staking Rewards Token",
        "description": "Use this token to claim a " + type + " of the day on https://stakingrewards.com frontpage between " + startDate.toLocaleString('default', { timeZone: 'UTC', month: 'short' }) + " " + startDate.getUTCDate() + "-" + endDate.toLocaleString('default', { timeZone: 'UTC', month: 'short' }) + " " + endDate.getUTCDate() + ", " + endDate.getUTCFullYear() + ".\n\nRedeem the token at https://stakingrewards.com/redeem?token=" + tokenId + "\n\nDiscord: https://discordapp.com/invite/EqDF9GF\n\nEmail: info@stakingrewards.com\n\nBlog: https://www.stakingrewards.com/journal/news/srt-nfts-digital-ads/\n\nTerms: https://ipfs.io/ipfs/" + TERMS_HASH,
        "external_url": "https://stakingrewards.com"
    }
    metadata.image = STORAGE_BUCKET_URL + tokenId + "/stakingrewards-token.png"
    metadata.attributes = [{
            "trait_type": "token_id",
            "value": tokenId.toString()
        },
        {
            "trait_type": "valid_for",
            "value": TOKEN_VALID_FOR_Days + " days"
        },
        {
            "trait_type": "terms_version",
            "value": TERMS_VERSION.toString()
        },
        {
            "trait_type": "promotion_begins",
            "display_type": "date",
            "value": startTime
        },
        {
            "trait_type": "promotion_ends",
            "display_type": "date",
            "value": endTime
        }
    ]
    return http.post('create/' + tokenId, metadata)
}

async function main() {
    let startTime = Math.floor(Date.parse(FIRST_TOKEN_START_TIME) / 1000)
    const provider = new HDWalletProvider(PRIVATE_KEY, `https://${NETWORK}.infura.io/v3/${INFURA_KEY}`)
    const web3Instance = new web3(
        provider
    )

    if (NFT_CONTRACT_ADDRESS) {
        const nftContract = new web3Instance.eth.Contract(NFT_ABI, NFT_CONTRACT_ADDRESS, {
            gasLimit: "1000000"
        })
        let currentTokenIdResult = await nftContract.methods.currentTokenId().call({
            from: OWNER_ADDRESS
        });
        let currentTokenId = parseInt(currentTokenIdResult)

        // Promoted Pools issued directly to the owner.
        for (var i = 0; i < NUM_PROMOTED_POOLS; i++) {
            let endTime = startTime + TOKEN_VALID_FOR_SECONDS;
            console.log("Minting new promoted pool...")
            let mintResult = await nftContract.methods.mintTo(OWNER_ADDRESS, startTime, endTime, TERMS_HASH, TERMS_VERSION).send({
                from: OWNER_ADDRESS,
                gasPrice: "6000000000"
            });
            console.log("Minted Promoted Pool NFT. Transaction: " + mintResult.transactionHash)
            currentTokenId++
            let metadataResult = await createTokenMetadata(currentTokenId, startTime, endTime)
            if (metadataResult.status && metadataResult.status == 200) {
                console.log("Token metadata successfully created.");
                let tokenURIResult = await nftContract.methods.tokenURI(currentTokenId).call({
                    from: OWNER_ADDRESS
                });
                console.log("Token metadata URL: " + tokenURIResult)
                if (NETWORK == "mainnet" || NETWORK == "live") {
                    console.log("View on OpenSea: https://opensea.io/assets/" + NFT_CONTRACT_ADDRESS + "/" + currentTokenId)
                } else {
                    console.log("View on OpenSea: https://" + NETWORK + ".opensea.io/assets/" + NFT_CONTRACT_ADDRESS + "/" + currentTokenId)
                }
            } else {
                console.log("There was an error creating token metadata.")
            }
            startTime = endTime + TOKEN_TIME_BETWEEN_SECONDS;
            console.log("----------------------------------------------------------------------------------")
        }
    }
    process.exit(0);
}

main()