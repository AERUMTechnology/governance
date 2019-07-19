const utils = require("../utils");

const Governance = artifacts.require("Governance");
const AerumToken = artifacts.require("AerumToken");
const Delegate = artifacts.require("Delegate");

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

async function setUp(accounts) {
  owner = accounts[0];
  simpleUser = accounts[1];
  staker1 = accounts[2];
  staker2 = accounts[3];
  staker3 = accounts[4];
  notStaker = accounts[5];
  delegate1Owner = accounts[6];
  delegate2Owner = accounts[7];
  delegate3Owner = accounts[8];
  delegateApprover = accounts[9];

  token = await AerumToken.new();

  governance = await Governance.new();
  await governance.init(owner, token.address, 100, 24 * 60 * 60, 10, 100);

  await token.transfer(delegate1Owner, 1000);
  await token.transfer(delegate2Owner, 1000);
  await token.transfer(delegate3Owner, 1000);
}

async function createDelegate(name, delegateOwner) {
  await token.approve(governance.address, 100, { from: delegateOwner });
  const tx = await governance.createDelegate(name, delegateOwner, { from: delegateOwner });
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
      governance
    }
  },
  variables: function accounts() {
    return {}
  }
};