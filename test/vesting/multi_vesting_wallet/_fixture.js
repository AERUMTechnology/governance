const utils = require("../../utils");

const AerumToken = artifacts.require("AerumToken");
const MultiVestingWallet = artifacts.require("MultiVestingWallet");
const Governance = artifacts.require("Governance");
const Delegate = artifacts.require("Delegate");

let owner;
let beneficiary1;
let beneficiary2;
let beneficiary3;
let simpleUser;
let upgradeAdmin;
let delegateOwner;

let governance;
let token;
let delegate;
let vesting;

let start;
let duration;
let cliffOffset;

async function setUp(accounts, revocable = true) {
  owner = accounts[0];
  beneficiary1 = accounts[1];
  beneficiary2 = accounts[2];
  beneficiary3 = accounts[3];
  simpleUser = accounts[4];
  upgradeAdmin = accounts[5];
  delegateOwner = accounts[6];

  token = await AerumToken.new();
  governance = await Governance.new();
  await governance.init(owner, token.address, 100, 24 * 60 * 60, 10, 100);

  await token.transfer(delegateOwner, 1000);
  await token.approve(governance.address, 100, { from: delegateOwner });
  const tx = await governance.createDelegate("Delegate", upgradeAdmin, { from: delegateOwner });
  const addr = utils.getEventArg(tx, "DelegateCreated", "delegate");
  delegate = await utils.contractAt(Delegate, addr);

  await governance.approveDelegate(delegate.address, { from: owner });

  start = utils.blockTime() + 10;
  duration = 100;
  cliffOffset = 50;
  vesting = await MultiVestingWallet.new(token.address, start, cliffOffset, duration, revocable);

  await token.transfer(vesting.address, 1000);
}

module.exports = {
  setUp,
  accounts: function accounts() {
    return {
      owner,
      beneficiary1,
      beneficiary2,
      beneficiary3,
      simpleUser
    }
  },
  contracts: function accounts() {
    return {
      token,
      vesting,
      delegate
    }
  },
  variables: function accounts() {
    return {
      start,
      duration,
      cliffOffset
    }
  }
};
