const utils = require("../utils");
const BN = web3.utils.BN;

const Governance = artifacts.require("Governance");
const AerumToken = artifacts.require("AerumToken");
const Delegate = artifacts.require("Delegate");
const DelegateFactory = artifacts.require("DelegateFactory");

const delegateBond = (new BN(1000000)).mul((new BN(10)).pow(new BN(18)));
let owner;
let simpleUser;
let staker1;
let staker2;
let staker3;
let notStaker;
let delegate1Owner;
let delegate2Owner;
let delegate3Owner;
let delegateApprover;

let token;
let governance;
let factory;

async function setUp(accounts) {
  owner = accounts[0];
  simpleUser = accounts[1];
  staker1 = accounts[2];
  staker2 = accounts[3];
  staker3 = accounts[4];
  staker4 = accounts[5];
  notStaker = accounts[6];
  delegate1Owner = accounts[6];
  delegate2Owner = accounts[7];
  delegate3Owner = accounts[8];
  delegateApprover = accounts[9];

  token = await AerumToken.new();
  factory = await DelegateFactory.new(token.address);
  governance = await Governance.new();
  await governance.init(owner, token.address, factory.address, 10, delegateBond);

  await token.transfer(delegate1Owner, delegateBond.mul((new BN(10))));
  await token.transfer(delegate2Owner, delegateBond.mul((new BN(10))));
  await token.transfer(delegate3Owner, delegateBond.mul((new BN(10))));
}

async function createDelegate(name, delegateOwner) {
  await token.approve(governance.address, delegateBond, { from: delegateOwner });
  const tx = await governance.createDelegate(utils.asciiToHex(name), delegateOwner, { from: delegateOwner });
  const addr = utils.getEventArg(tx, "DelegateCreated", "delegate");
  return await utils.contractAt(Delegate, addr);
}

module.exports = {
  setUp,
  createDelegate,
  accounts: function accounts() {
    return {
      owner,
      staker1,
      staker2,
      staker3,
      staker4,
      simpleUser,
      notStaker,
      delegate1Owner,
      delegate2Owner,
      delegate3Owner,
      delegateApprover
    }
  },
  contracts: function accounts() {
    return {
      token,
      governance,
      factory
    }
  },
  variables: function accounts() {
    return {}
  }
};
