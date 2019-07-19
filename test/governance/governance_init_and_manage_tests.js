const utils = require("../utils");
const fixture = require("./_fixture");

const Governance = artifacts.require("Governance");

contract('governance > init and manage', (accounts) => {

  let owner;
  let simpleUser;
  let delegateApprover;

  let governance;
  let token;

  before(async () => {
    await fixture.setUp(accounts);

    const contracts = fixture.contracts();
    governance = contracts.governance;
    token = contracts.token;

    const fixtureAccounts = fixture.accounts();
    owner = fixtureAccounts.owner;
    simpleUser = fixtureAccounts.simpleUser;
    delegateApprover = fixtureAccounts.delegateApprover;
  });

  it("governance should be initialized correctly", async () => {
    assert.isTrue(!!governance, 'contract is not deployed');
    assert.equal(await governance.owner(), owner);
    assert.equal(await governance.upgradeAdmin(), owner);
    assert.equal(await governance.delegateApprover(), owner);
    assert.equal(await governance.token(), token.address);
    assert.equal(await governance.delegateBond(), 100);
    assert.equal(await governance.getMinBalance(utils.blockTime()), 100);
    assert.equal(await governance.getKeepAliveDuration(utils.blockTime()), 24 * 60 * 60);
    assert.equal(await governance.getComposersCount(utils.blockTime()), 10);
    assert.equal(await governance.delegateApproverRenounced(), false);
  });

  it("should not be able to init with empty owner address", async () => {
    try {
      const governance = await Governance.new();
      await governance.init(0, token.address, 100, 24 * 60 * 60, 10, 100);
      assert.fail("was able to init with empty owner address");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to init with empty token address", async () => {
    try {
      const governance = await Governance.new();
      await governance.init(owner, 0, 100, 24 * 60 * 60, 10, 100);
      assert.fail("was able to init with empty token address");
    } catch (e) {
      utils.assertVMError(e);
    }
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

  it("should be able to set min balance", async () => {
    await governance.setMinBalance(300, { from: owner });
    assert.equal(await governance.getMinBalance(utils.blockTime()), 300);
  });

  it("should not be able to set min balance from not owner", async () => {
    try {
      await governance.setMinBalance(500, { from: simpleUser });
      assert.fail("was able to set min balance from not owner");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to set keep alive duration", async () => {
    await governance.setKeepAliveDuration(10 * 60, { from: owner });
    assert.equal(await governance.getKeepAliveDuration(utils.blockTime()), 10 * 60);
  });

  it("should not be able to set keep alive duration from not owner", async () => {
    try {
      await governance.setKeepAliveDuration(10 * 60, { from: simpleUser });
      assert.fail("was able to set keep alive duration from not owner");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to get composers count", async () => {
    await governance.setComposersCount(20, { from: owner });
    assert.equal(await governance.getComposersCount(utils.blockTime()), 20);
  });

  it("should not be able to get composers count from not owner", async () => {
    try {
      await governance.setComposersCount(20, { from: simpleUser });
      assert.fail("was able to get composers count from not owner");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to set delegate approver if not owner", async () => {
    try {
      await governance.setDelegateApprover(delegateApprover, { from: simpleUser });
      assert.fail("was able to set delegate approver if not owner");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to set delegate approver", async () => {
    await governance.setDelegateApprover(delegateApprover, { from: owner });
    assert.equal(await governance.delegateApprover(), delegateApprover);
  });

  it("should not be able to renounce delegate approver if not owner", async () => {
    try {
      await governance.renouncedDelegateApprover({ from: delegateApprover });
      assert.fail("was able to renounce delegate approver if not owner");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to renounce delegate approver", async () => {
    await governance.renouncedDelegateApprover({ from: owner });
    assert.equal(await governance.delegateApprover(), 0);
    assert.equal(await governance.delegateApproverRenounced(), true);
  });

  it("should not be able to set delegate approver if renounced", async () => {
    try {
      await governance.setDelegateApprover(delegateApprover, { from: owner });
      assert.fail("was able to set delegate approver if renounced");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

});
