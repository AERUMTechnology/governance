const AerumToken = artifacts.require("AerumToken");
const AirDrop = artifacts.require("AirDrop");

let owner;
let beneficiary1;
let beneficiary2;
let beneficiary3;
let simpleUser;

let token;
let airdrop;

async function setUp(accounts) {
  owner = accounts[0];
  beneficiary1 = accounts[1];
  beneficiary2 = accounts[2];
  beneficiary3 = accounts[3];
  simpleUser = accounts[4];

  token = await AerumToken.new();
  airdrop = await AirDrop.new(token.address);
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
      airdrop
    }
  },
  variables: function accounts() {
    return { }
  }
};
