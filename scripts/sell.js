const opensea = require('opensea-js')
const OpenSeaPort = opensea.OpenSeaPort;
const Network = opensea.Network;
const MnemonicWalletSubprovider = require('@0x/subproviders').MnemonicWalletSubprovider
const RPCSubprovider = require('web3-provider-engine/subproviders/rpc')
const Web3ProviderEngine = require('web3-provider-engine')
require('dotenv').config();

const MNEMONIC = process.env.MNEMONIC
const INFURA_KEY = process.env.INFURA_KEY
const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS
const OWNER_ADDRESS = process.env.OWNER_ADDRESS
const NETWORK = process.env.NETWORK
const API_KEY = process.env.API_KEY || "" // API key is optional but useful if you're doing a high volume of requests.
const AUCTION_TYPE = process.env.AUCTION_TYPE

if (!MNEMONIC || !INFURA_KEY || !NETWORK || !OWNER_ADDRESS) {
    console.error("Please set a private key, infura key, owner, network, API key, nft contract, and factory contract address.")
    return
}

if (!NFT_CONTRACT_ADDRESS) {
    console.error("Please either set a NFT contract address.")
    return
}

const BASE_DERIVATION_PATH = `44'/60'/0'/0`

const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
const DAI_ADDRESS = '0x6b175474e89094c44da98b954eedeac495271d0f'
const USDT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7'
const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

const RINKEBY_WETH_ADDRESS = '0xc778417e063141139fce010982780140aa0cd5ab'

const tokenIds = ["1", "2"]

const mnemonicWalletSubprovider = new MnemonicWalletSubprovider({ mnemonic: MNEMONIC, baseDerivationPath: BASE_DERIVATION_PATH})
const infuraRpcSubprovider = new RPCSubprovider({
    rpcUrl: 'https://' + NETWORK + '.infura.io/v3/' + INFURA_KEY,
})

const providerEngine = new Web3ProviderEngine()
providerEngine.addProvider(mnemonicWalletSubprovider)
providerEngine.addProvider(infuraRpcSubprovider)
providerEngine.start();

const seaport = new OpenSeaPort(providerEngine, {
    networkName: NETWORK === 'mainnet' ? Network.Main : Network.Rinkeby,
    apiKey: API_KEY
}, (arg) => console.log(arg))

const simpleAuction = async (tokenId, paymentAddress) => {
    console.log("Auctioning an item for a fixed price...")
    const fixedPriceSellOrder = await seaport.createSellOrder({
        asset: {
            tokenId: tokenId,
            tokenAddress: NFT_CONTRACT_ADDRESS
        },
        startAmount: .05,
        expirationTime: 0,
        paymentTokenAddress: paymentAddress,
        accountAddress: OWNER_ADDRESS
    })    
    console.log(`Successfully created a fixed-price sell order! ${fixedPriceSellOrder.asset.openseaLink}\n`)
}

const dutchAuction = async (tokenId, paymentAddress) => {
    console.log("Dutch auctioning an item...")
    const expirationTime = Math.round(Date.now() / 1000 + 60 * 60 * 24)
    const dutchAuctionSellOrder = await seaport.createSellOrder({
        asset: {
            tokenId: tokenId,
            tokenAddress: NFT_CONTRACT_ADDRESS
        },
        startAmount: 200,
        endAmount: 50,
        expirationTime: expirationTime,
        paymentTokenAddress: paymentAddress,
        accountAddress: OWNER_ADDRESS
    })
    console.log(`Successfully created a dutch auction sell order! ${dutchAuctionSellOrder.asset.openseaLink}\n`)
}

const englishAuction = async (tokenId, paymentAddress) => {
    console.log("English auctioning an item...")
    
    const englishAuctionSellOrder = await seaport.createSellOrder({
        asset: {
            tokenId: tokenId,
            tokenAddress: NFT_CONTRACT_ADDRESS
        },
        startAmount: .03,
        expirationTime: expirationTime,
        waitForHighestBid: true,
        paymentTokenAddress: paymentAddress,
        accountAddress: OWNER_ADDRESS
    })
    console.log(`Successfully created an English auction sell order! ${englishAuctionSellOrder.asset.openseaLink}\n`)
}

async function main() {

    const paymentAddress = NETWORK == 'mainnet' ? DAI_ADDRESS : RINKEBY_WETH_ADDRESS

    for (tokenId of tokenIds) {
        try {
            switch (AUCTION_TYPE) {
                case 'simple':
                    await simpleAuction(tokenId, paymentAddress)
                    break;
                case 'dutch':
                    await dutchAuction(tokenId, paymentAddress)
                    break;
                case 'english':
                    await englishAuction(tokenId, paymentAddress)
                    break;
            }
        } catch (e) {
            console.log(e)
            process.exit(1)
        }
    }
    
    process.exit(0)
}

main()