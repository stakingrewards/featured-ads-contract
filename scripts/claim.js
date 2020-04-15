const HDWalletProvider = require("@truffle/hdwallet-provider")
const web3 = require('web3')
var fs = require('fs');
require('dotenv').config();

const PRIVATE_KEY = process.env.PRIVATE_KEY
const INFURA_KEY = process.env.INFURA_KEY
const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS
const OWNER_ADDRESS = process.env.OWNER_ADDRESS
const NETWORK = process.env.NETWORK

if (!PRIVATE_KEY || !INFURA_KEY || !OWNER_ADDRESS || !NETWORK || !NFT_CONTRACT_ADDRESS) {
    console.error("Please set a PRIVATE_KEY, infura key, owner, network, and contract address.")
    return
}

const CONTRACT = JSON.parse(fs.readFileSync('./build/contracts/StakingRewardsToken.json'))

// individual params to be set for claiming
const TOKEN_ID = 1
const AD_SLUG = "tezos"

async function main() {

    const provider = new HDWalletProvider(PRIVATE_KEY, `https://${NETWORK}.infura.io/v3/${INFURA_KEY}`)
    const web3Instance = new web3(
        provider
    )

    const nftContract = new web3Instance.eth.Contract(CONTRACT.abi, NFT_CONTRACT_ADDRESS, {
        gasLimit: "1000000"
    })

    try {
        console.log("Claiming Ad...")
        let result = await nftContract.methods.claimAd(TOKEN_ID, AD_SLUG).send({
            from: OWNER_ADDRESS,
            gasPrice: "6000000000"
        });
        console.log(result.events)
    } catch (e) {
        console.log(e)
        process.exit(1)
    }
    
    try {
        console.log("Updating Ads...")
        let result = await nftContract.methods.updateAds().send({
            from: OWNER_ADDRESS,
            gasPrice: "6000000000"
        });
        console.log(result.events)
    } catch (e) {
        console.log(e)
        process.exit(1)
    }

    let currentAsset;
    let currentProvider;
    try {
        currentAsset = await nftContract.methods.getCurrentAd(0).call({
            from: OWNER_ADDRESS
        });
        currentProvider = await nftContract.methods.getCurrentAd(1).call({
            from: OWNER_ADDRESS
        });
    } catch (e) {
        console.log(e)
        process.exit(1)
    }

    console.log(`Current Asset Ad: ${currentAsset}`)
    console.log(`Current Provider Ad: ${currentProvider}`)

    process.exit(0);
}

main()