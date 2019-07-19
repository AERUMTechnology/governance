const utils = require("../../utils");
const BN = web3.utils.BN;

const AerumToken = artifacts.require("AerumToken");
const VestingWallet = artifacts.require("VestingWallet");
const Governance = artifacts.require("Governance");
const Delegate = artifacts.require("Delegate");
const DelegateFactory = artifacts.require("DelegateFactory");

const delegateBond = (new BN(1000000)).mul((new BN(10)).pow(new BN(18)));
let owner;
let beneficiary;
let delegateOwner;
let upgradeAdmin;
let simpleUser;

let governance;
let token;
let delegate;
let vesting;
let factory;

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
  factory = await DelegateFactory.new(token.address);
  governance = await Governance.new();
  await governance.init(owner, token.address, factory.address, 10, delegateBond);

  await token.transfer(delegateOwner, delegateBond);
  await token.approve(governance.address, delegateBond, { from: delegateOwner });
  const tx = await governance.createDelegate(utils.asciiToHex("Delegate"), upgradeAdmin, { from: delegateOwner });
  const addr = utils.getEventArg(tx, "DelegateCreated", "delegate");
  delegate = await utils.contractAt(Delegate, addr);

  start = (await utils.blockTime()) + 10;
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
      vesting,
      factory
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
