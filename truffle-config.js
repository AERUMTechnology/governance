require('dotenv').config();

const WalletProvider = require("truffle-wallet-provider");
const Wallet = require('ethereumjs-wallet');

module.exports = {
  solc: {
    optimizer: {
      "enabled": true,
      "runs": 200
    }
  },
  networks: {
    development: {
      host: "localhost",
      port: 7545,
      network_id: "*" // Match any network id
    },
    rinkeby: {
      provider: function() {
        var rinkebyPrivateKey = new Buffer(process.env["RINKEBY_PRIVATE_KEY"], "hex");
        var rinkebyWallet = Wallet.fromPrivateKey(rinkebyPrivateKey);
        var rinkebyProvider = new WalletProvider(rinkebyWallet, "https://rinkeby.infura.io/");
        return rinkebyProvider;
      },
      network_id: '4',
    }
  }
};