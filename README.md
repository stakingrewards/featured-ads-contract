# Featured Ads ERC721 contract

## Installation

Run
```bash
npm install
```

If you run into an error while building the dependencies and you're on a Mac, run the code below, remove your `node_modules` folder, and do a fresh `npm install`:

```bash
xcode-select --install # Install Command Line Tools if you haven't already.
sudo xcode-select --switch /Library/Developer/CommandLineTools # Enable command line tools
sudo npm explore npm -g -- npm install node-gyp@latest # Update node-gyp
```

## Setting token environment variables

For running the scripts you need to set some environment variables first:

```
INFURA_KEY="<infura_key>" // create an infura account for accressing network
OWNER_ADDRESS="<metamask_address>" // metamask address which is owner of the contract and newly minted tokens
PRIVATE_KEY="<metmask_private_key>" // private key of that metamask account
MNEMONIC="<metmask_mnemonic>" // mnemonic of that metamask account
NETWORK="<rinkeby|mainnet>" // network youre acting on
TERMS_HASH="<terms_ipfs_hash>" // ipfs hash of terms file
NFT_CONTRACT_ADDRESS="<deployed_nft_contract_address>" // deployed contract address
AUCTION_TYPE="<simple|dutch|english>" // auction type if you want to create sell order on opensea
```

## Deploying

### Deploying

1. You'll need to sign up for [Infura](https://infura.io) and get an API key.
2. Using your API key and the private key for your Metamask wallet (make sure you're using a Metamask private key that is appropriate for your usecase), run:

```
truffle deploy --network development|rinkeby|live
```

After deploying, there will be a contract on Ethereum|Rinkeby that will be viewable on [Etherscan](https://etherscan.io). For example, here is a [recently deployed contract](https://rinkeby.etherscan.io/address/0x98f48f7b1f0d9402c375fe1c92f6e114b7508fc4) on rinkeby.


## Minting

In order to mint your tokens you have to prepare several things first.

### Pinning the contract terms to IPFS

You will need an IPFS hash of the most recent terms and conditions (located in the terms directory) in order to mint your tokens. Each version is specified by the number that serves as the filename.

An easy way to pin data to IPFS is to use a service like [Pinata](https://pinata.cloud/pinataupload) to upload the file. Upload the latest version of the terms, copy the hash that's returned, and put it as env variable.

### Upload the meta images

Your minted tokens will have metadata to be visible in the Opensea marketplace.
To have an image for each token to be displayed in Opensea, you need to upload them on a publicly facing filestore.
For Staking Rewards Token, images are stored at https://storage.googleapis.com/stakingrewards-token/meta/<token_id>/image.gif

### Set Token params

Each token is based on a type, startDate and endDate. Those params are stored at token level and also shown in the metadata.
To prepare the minting script you have to define them individually in the minting script:

```
TOKEN_TYPE = TOKEN_TYPES[<0|1|2>] // type of the tokens you want to mint
NUM_ADS = 10 // number of tokens you want to mint
TERMS_VERSION = 1 // terms version
TOKEN_VALID_FOR_DAYS = 5 // validation period of your tokens, every token to be minted will have its start date after this time
FIRST_TOKEN_START_TIME = "2020-04-20T00:00:00+0000" // datetime when the first token starts
```

Then run:

```
node scripts/mint.js
```

## Claiming the tokens

The contract offers a function to claim a token. By claiming a token you can set or update the slug that defines the featured asset or provider.
Token ID and slug need to be defined for a successful execution.

```
TOKEN_ID = <token_id> // the id of the token youre the owner of and want to claim an ad
AD_SLUG = "<slug>" // the slug of the ad you want to claim (needs to be added on stakingrewards.com and fit to the token type)
```

Then run:

```
node scripts/claim.js
```

## Selling the Tokens

On Opensea you have several auction/sell options. To activate a special auction type run the sell script by specifying the `tokenIds` const and setting the auction type in your env variables first.

```
node scripts/sell.js
```