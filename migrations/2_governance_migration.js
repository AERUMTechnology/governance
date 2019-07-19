const AerumToken = artifacts.require("AerumToken");
const Governance = artifacts.require("Governance");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");

module.exports = function(deployer, network, accounts) {
  deployer.then(async () => {
    const owner = accounts[0];

    await deployer.deploy(AerumToken);
    await deployer.deploy(Governance);
    const proxy = await deployer.deploy(OwnedUpgradeabilityProxy, Governance.address);
    const governance = new Governance(proxy.address);
    const upgradeabilityAdmin = owner;

    console.log("Initializing governance");

    if (network === "development") {
      await governance.init(upgradeabilityAdmin, AerumToken.address, 100, 24 * 60 * 60, 10, 100);
    }

    if (network === "rinkeby") {
      const minStake = 10 * Math.pow(10, 18);
      const delegateBond = 10 * Math.pow(10, 18);
      await governance.init(upgradeabilityAdmin, AerumToken.address, minStake, 24 * 60 * 60, 10, delegateBond);
    }

    console.log("Governance initiated");
  });
};