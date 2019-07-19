const utils = require("../utils");
const fixture = require("./_fixture");

const Governance = artifacts.require("Governance");
const BN = web3.utils.BN;

contract('governance > init and manage', (accounts) => {
  const delegateBond = (new BN(1000000)).mul((new BN(10)).pow(new BN(18)));
  let owner;
  let simpleUser;
  let delegateApprover;

  let governance;
  let token;
  let factory;

  before(async () => {
    await fixture.setUp(accounts);

    const contracts = fixture.contracts();
    governance = contracts.governance;
    token = contracts.token;
    factory = contracts.factory;

    const fixtureAccounts = fixture.accounts();
    owner = fixtureAccounts.owner;
    simpleUser = fixtureAccounts.simpleUser;
    delegateApprover = fixtureAccounts.delegateApprover;
  });

  it("governance should be initialized correctly", async () => {
    assert.isTrue(!!governance, 'contract is not deployed');
    assert.equal(await governance.owner(), owner);
    assert.equal(await governance.upgradeAdmin(), owner);
    assert.equal(await governance.token(), token.address);
    assert.isTrue((await governance.delegateBond()).eq(delegateBond));
    assert.equal(await governance.getComposersCount(await utils.blockTime()), 10);
  });
  
  it("should not be able to init with empty owner address", async () => {
    try {
      const governance = await Governance.new();
      await governance.init('0x0000000000000000000000000000000000000000', token.address, factory.address, 10, 100);
      assert.fail("was able to init with empty owner address");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to init with empty token address", async () => {
    try {
      const governance = await Governance.new();
      await governance.init(owner, '0x0000000000000000000000000000000000000000', factory.address, 10, 100);
      assert.fail("was able to init with empty token address");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to set new voting period", async () => {
    try {
      await governance.setVotingPeriod(60 * 60 * 24 * 7 * 5, { from: owner });
      assert.fail("was able to set new voting period");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to set new voting period", async () => {
    await governance.setVotingPeriod(60 * 60 * 24 * 7 * 2, { from: owner });
  });

  it("should be able to change upgrade admin", async () => {
    await governance.setUpgradeAdmin(simpleUser, { from: owner });
    assert.equal(await governance.upgradeAdmin(), simpleUser);
    await governance.setUpgradeAdmin(owner, { from: owner });
  });

  it("should not be able to change upgrade admin from not owner", async () => {
    try {
      await governance.setUpgradeAdmin(simpleUser, { from: simpleUser });
      assert.fail("was able to change upgrade admin from not admin");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to get composers count", async () => {
    await governance.setComposersCount(20, { from: owner });
    assert.equal(await governance.getComposersCount(await utils.blockTime()), 20);
  });

  it("should not be able to get composers count from not owner", async () => {
    try {
      await governance.setComposersCount(20, { from: simpleUser });
      assert.fail("was able to get composers count from not owner");
    } catch (e) {
      utils.assertVMError(e);
    }
  });
});
