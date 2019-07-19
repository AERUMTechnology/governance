const AerumToken = artifacts.require("AerumToken");
const Governance = artifacts.require("Governance");
const DelegateFactory = artifacts.require("DelegateFactory");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const BN = web3.utils.BN;

module.exports = function(deployer, network, accounts) {
  deployer.then(async () => {
    const owner = accounts[0];

    await deployer.deploy(AerumToken);
    await deployer.deploy(DelegateFactory, AerumToken.address);
    await deployer.deploy(Governance);
    const proxy = await deployer.deploy(OwnedUpgradeabilityProxy, Governance.address, owner);
    const governance = new Governance(proxy.address);
    const upgradeabilityAdmin = owner;

    console.log("Initializing governance");
    const delegateBond = (new BN(1000000)).mul((new BN(10)).pow(new BN(18)));
    if (network === "development") {
      await governance.init(upgradeabilityAdmin, AerumToken.address, DelegateFactory.address, 10, delegateBond);
    }

    if (network === "rinkeby") {
      await governance.init(upgradeabilityAdmin, AerumToken.address, DelegateFactory.address, 10, delegateBond);
    }

    console.log("Governance initiated");
  });
};
