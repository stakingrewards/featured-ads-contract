const HDWalletProvider = require("@truffle/hdwallet-provider")
const web3 = require('web3')
const axios = require('axios')
const FormData = require('form-data');
var fs = require('fs');
require('dotenv').config();

const PRIVATE_KEY = process.env.PRIVATE_KEY
const INFURA_KEY = process.env.INFURA_KEY
const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS
const OWNER_ADDRESS = process.env.OWNER_ADDRESS
const NETWORK = process.env.NETWORK
const TERMS_HASH = process.env.TERMS_HASH

if (!PRIVATE_KEY || !INFURA_KEY || !OWNER_ADDRESS || !NETWORK || !NFT_CONTRACT_ADDRESS) {
    console.error("Please set a PRIVATE_KEY, infura key, owner, network, and contract address.")
    return
}

const TOKEN_TYPES = ['Asset', 'Provider', 'Journal']
// individual params to be set for each minting
const TOKEN_TYPE = TOKEN_TYPES[1]
const NUM_ADS = 2
const TERMS_VERSION = 1
const TOKEN_VALID_FOR_DAYS = 5
const FIRST_TOKEN_START_TIME = "2020-04-27T00:00:00+0000"

const CONTRACT = JSON.parse(fs.readFileSync('./build/contracts/StakingRewardsToken.json'))
const STORAGE_BUCKET_URL = "https://storage.googleapis.com/stakingrewards-token/meta/"
const TOKEN_VALID_FOR_SECONDS = (TOKEN_VALID_FOR_DAYS * 24 * 60 * 60) - 1;
const TOKEN_TIME_BETWEEN_SECONDS = 2 * 24 * 60 * 60;

async function createTokenMetadata(tokenId, startTime, endTime, type) {
    const startDate = new Date(startTime * 1000);
    const endDate = new Date(endTime * 1000);
    let metadata = {
        "name": `Staking Rewards Token #${tokenId} - Featured ${type}`,
        "description": `Use this token to feature ${type == 'Asset' ? 'an ' + type : 'a ' + type} on the https://www.stakingrewards.com frontpage between ${startDate.toLocaleString('en-us', { timeZone: 'UTC', month: 'short' })} ${startDate.getUTCDate()} - ${endDate.toLocaleString('en-us', { timeZone: 'UTC', month: 'short' })} ${endDate.getUTCDate()}, ${endDate.getUTCFullYear()}.

Redeem the token at https://www.stakingrewards.com/redeem?id=${tokenId}

Blog: https://www.stakingrewards.com/journal/news/decentralized-advertising-with-staking-rewards

Terms: https://ipfs.io/ipfs/${TERMS_HASH}

Discord: https://www.stakingrewards.com/discord`,
        "external_url": "https://www.stakingrewards.com"
    }
    metadata.image = STORAGE_BUCKET_URL + tokenId + "/image.gif"
    metadata.attributes = [{
            "trait_type": "token_id",
            "value": tokenId.toString()
        },
        {
            "trait_type": "valid_for",
            "value": TOKEN_VALID_FOR_DAYS + " days"
        },
        {
            "trait_type": "terms_version",
            "value": TERMS_VERSION.toString()
        },
        {
            "trait_type": "type",
            "value": `Featured ${type}`
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

    fs.writeFileSync('/tmp/meta.json', JSON.stringify(metadata))

    const fd = new FormData();
    const stream = fs.createReadStream('/tmp/meta.json');
    fd.append('file', stream);
    const formHeaders = fd.getHeaders();

    return axios.post(
        'https://ipfs.infura.io:5001/api/v0/add',
        fd,
        {
            headers: {
              ...formHeaders,
            },
        }
    );
}

async function main() {
    let startTime = Math.floor(Date.parse(FIRST_TOKEN_START_TIME) / 1000)
    const provider = new HDWalletProvider(PRIVATE_KEY, `https://${NETWORK}.infura.io/v3/${INFURA_KEY}`)
    const web3Instance = new web3(
        provider
    )

    const nftContract = new web3Instance.eth.Contract(CONTRACT.abi, NFT_CONTRACT_ADDRESS, {
        gasLimit: "2000000"
    })
    let currentTokenIdResult = await nftContract.methods.currentTokenId().call({
        from: OWNER_ADDRESS
    });
    let currentTokenId = parseInt(currentTokenIdResult)

    for (var i = 0; i < NUM_ADS; i++) {
        let endTime = startTime + TOKEN_VALID_FOR_SECONDS;
        console.log("Minting new token...")

        let metadataResult;

        try {
            metadataResult = await createTokenMetadata(currentTokenId + 1, startTime, endTime, TOKEN_TYPE)
        } catch (e) {
            console.log("There was an error creating token metadata.", e)
            process.exit(1);
        }

        if (!metadataResult.status || metadataResult.status !== 200 || !metadataResult.data.Hash) {
            console.log("There was an error creating token metadata.")
            process.exit(1);
        }

        console.log("Token metadata successfully created.", metadataResult.data.Hash);

        let mintResult = await nftContract.methods.mintTo(OWNER_ADDRESS, startTime, endTime, TERMS_HASH, TERMS_VERSION, metadataResult.data.Hash, TOKEN_TYPES.indexOf(TOKEN_TYPE)).send({
            from: OWNER_ADDRESS,
            gasPrice: "7000000000"
        });

        console.log("Minted NFT Transaction: " + mintResult.transactionHash)
        currentTokenId++

        let tokenURIResult = await nftContract.methods.tokenURI(currentTokenId).call({
            from: OWNER_ADDRESS
        });
        console.log("Token metadata URL: " + tokenURIResult)

        if (NETWORK == "mainnet" || NETWORK == "live") {
            console.log("View on OpenSea: https://opensea.io/assets/" + NFT_CONTRACT_ADDRESS + "/" + currentTokenId)
        } else {
            console.log("View on OpenSea: https://" + NETWORK + ".opensea.io/assets/" + NFT_CONTRACT_ADDRESS + "/" + currentTokenId)
        }

        startTime = endTime + TOKEN_TIME_BETWEEN_SECONDS + 1;
        console.log("----------------------------------------------------------------------------------")
    }

    process.exit(0);
}

main()