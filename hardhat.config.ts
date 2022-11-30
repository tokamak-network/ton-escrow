require("@nomiclabs/hardhat-waffle");
require("dotenv/config");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.0",
  // defaultNetwork: "rinkeby",
  networks: {
    hardhat: {
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        accountsBalance: '10000000000000000000000',
      },
      chainId: 31337,
    },
    // hardhat: {
    //   forking: {
    //     url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`
    //   }
    // },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [ 
        `${process.env.RINKEBY_PRIVATE_KEY}`
      ],
      // gasPrice: 16000000000,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [ `${process.env.MAINNET_PRIVATE_KEY}` ]    
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 21
  }
};
