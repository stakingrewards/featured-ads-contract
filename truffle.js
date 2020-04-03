const HDWalletProvider = require("@truffle/hdwallet-provider");
const PRIVATE_KEY = process.env.PRIVATE_KEY
const INFURA_KEY = process.env.INFURA_KEY
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY

if (!PRIVATE_KEY || !INFURA_KEY) {
  console.error("Please set a PRIVATE_KEY and infura key.")
  return
}

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      gas: 4600000,
      network_id: "*" // Match any network id
    },
    rinkeby: {
      provider: function() {
        return new HDWalletProvider(
          PRIVATE_KEY,
          "https://rinkeby.infura.io/v3/" + INFURA_KEY
        );
      },
      network_id: "4",
      gas: 4000000
    },
    live: {
      network_id: 1,
      provider: function() {
        return new HDWalletProvider(
          PRIVATE_KEY,
          "https://mainnet.infura.io/v3/" + INFURA_KEY
        );
      },
      gas: 4000000,
      gasPrice: 5000000000
    },
    mocha: {
      reporter: 'eth-gas-reporter',
      reporterOptions : {
        currency: 'USD',
        gasPrice: 2
      }
    },
    compilers: {
      solc: {
        version: "0.6.4"
      }
    }, 
  },
  plugins: [
    'truffle-plugin-verify'
  ],
  api_keys: {
    etherscan: ETHERSCAN_API_KEY
  },
  verify: {
    preamble: 
`
Author: Jannik Schmiedl (@sandburg2011)\n
Email: jannik@stakingrewards.com\n
Organization: Staking Rewards (@stakingrewards)\n
Version: 1.0\n
Learn More: https://stakingrewards.com/journal
`
  }
};
