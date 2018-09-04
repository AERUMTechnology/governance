var AerumToken = artifacts.require("./token/AerumToken.sol");
var AerumTokenSpender = artifacts.require("./sample/AerumTokenSpender.sol");

module.exports = function(deployer, network) {
  if (network === "development") {
      deployer.deploy(AerumToken).then(function() {
        return deployer.deploy(AerumTokenSpender, AerumToken.address);
      });
  } else {
      deployer.deploy(AerumToken);
  }
};