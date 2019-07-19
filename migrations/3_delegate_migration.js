const utils = require("../test/utils");

const AerumToken = artifacts.require("AerumToken");
const Governance = artifacts.require("Governance");
const Delegate = artifacts.require("Delegate");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");

const delegateAerumAddresses = [
  '0x22c9a22a27d646d126dfd7fba4e1ff6e21f371ac',
  '0xc7074d9548d2b22d5feff8e3737920efe2821506',
  '0x38b5c204bdeee56459c7ac758d642daeadfa17a7',
  '0x19b83aed5ebb5591ba119218ee5fcd7059fb0d85',
  '0xeb157d1f4521365011e534d8bf9ab4652db42428'
];

module.exports = function (deployer, network) {
  deployer.then(async () => {
    if (network === "development") {
      return
    }

    const token = new AerumToken(AerumToken.address);
    const governance = new Governance(OwnedUpgradeabilityProxy.address);
    const delegateBond = await governance.delegateBond();
    const minStake = await governance.getMinBalance(utils.epoch());

    const numberOfDelegates = delegateAerumAddresses.length;
    for (let index = 0; index < numberOfDelegates; index++) {
      const name = "Delegate" + (index + 1);

      console.log(`Deploying delegate: ${name}`);
      await token.approve(governance.address, delegateBond);
      const tx = await governance.createDelegate(name, delegateAerumAddresses[index]);
      const addr = utils.getEventArg(tx, "DelegateCreated", "delegate");
      const delegate = await utils.contractAt(Delegate, addr);
      console.log(`Delegate deployed: ${name}. Address: ${addr}`);

      await governance.approveDelegate(delegate.address);
      console.log(`Delegate approved: ${name}`);

      await token.approve(delegate.address, minStake);
      await delegate.stake(minStake);
      console.log(`Delegate staked: ${name}`);

      await delegate.lockStake(minStake);
      console.log(`Stake locked for delegate: ${name}`);

      await delegate.keepAlive();
      console.log(`Keeps alive sent for delegate: ${name}`);
    }
  });
};