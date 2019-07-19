const utils = require("../../utils");

const AerumToken = artifacts.require("AerumToken");
const VestingWallet = artifacts.require("VestingWallet");
const Governance = artifacts.require("Governance");
const Delegate = artifacts.require("Delegate");

let owner;
let beneficiary;
let delegateOwner;
let upgradeAdmin;
let simpleUser;

let governance;
let token;
let delegate;
let vesting;

let start;
let duration;
let cliffOffset;
let tokensVested;

async function setUp(accounts, revocable = true) {
  owner = accounts[0];
  beneficiary = accounts[1];
  upgradeAdmin = accounts[2];
  simpleUser = accounts[3];
  delegateOwner = accounts[4];

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
  vesting = await VestingWallet.new(token.address, governance.address, beneficiary, start, cliffOffset, duration, revocable);

  tokensVested = 100;
  await token.transfer(vesting.address, tokensVested);
}

module.exports = {
  setUp,
  accounts: function accounts() {
    return {
      owner,
      beneficiary,
      delegateOwner,
      upgradeAdmin,
      simpleUser
    }
  },
  contracts: function accounts() {
    return {
      governance,
      token,
      delegate,
      vesting
    }
  },
  variables: function accounts() {
    return {
      start,
      duration,
      cliffOffset,
      tokensVested
    }
  }
};