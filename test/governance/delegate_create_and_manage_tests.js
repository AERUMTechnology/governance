const utils = require("../utils");
const fixture = require("./_fixture");

const Delegate = artifacts.require("Delegate");

contract('governance > create and manage delegate', (accounts) => {

  let token;
  let governance;
  let delegate;

  let owner;
  let simpleUser;
  let delegateOwner;
  let delegateApprover;

  let composersTime;

  before(async () => {
    await fixture.setUp(accounts);

    const contracts = fixture.contracts();
    governance = contracts.governance;
    token = contracts.token;

    const fixtureAccounts = fixture.accounts();
    owner = fixtureAccounts.owner;
    simpleUser = fixtureAccounts.simpleUser;
    delegateOwner = fixtureAccounts.delegate1Owner;
    delegateApprover = fixtureAccounts.delegateApprover;

    await governance.setDelegateApprover(delegateApprover, { from: owner });
  });

  it("should not be able to create a delegate if bond not provided", async () => {
    await token.approve(governance.address, 10, { from: delegateOwner });
    try {
      await governance.createDelegate("delegate", delegateOwner, { from: delegateOwner });
      assert.fail("was able to create a delegate if bond not provided");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to create a delegate", async () => {
    await token.approve(governance.address, 100, { from: delegateOwner });
    const delegateName = "delegate";
    delegate = await fixture.createDelegate(delegateName, delegateOwner);
    assert.isTrue(await governance.knownDelegates(delegate.address));
    assert.equal(await governance.bonds(delegate.address), 100);
    assert.equal(await delegate.getName(), delegateName);
  });

  it("should not be able to register custom delegate", async () => {
    const myDelegate = await Delegate.new();
    await myDelegate.init(owner, token.address, "myDelegate", owner);
    assert.isFalse(await governance.knownDelegates(myDelegate.address));

    try {
      await governance.approveDelegate(myDelegate.address);
      assert.fail("was able to register custom delegate");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to approve delegate if not owner or delegate approver", async () => {
    try {
      await governance.approveDelegate(delegate.address, { from: simpleUser });
      assert.fail("was able to register delegate if not owner");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to approve delegate", async () => {
    const delegatesBefore = await governance.getDelegates();
    assert.equal(delegatesBefore.length, 0);
    assert.isFalse(await delegate.isActive(utils.blockTime()));
    await governance.approveDelegate(delegate.address, { from: owner });
    const delegatesAfter = await governance.getDelegates();
    assert.equal(delegatesAfter.length, 1);
    assert.equal(delegatesAfter[0], delegate.address);
    assert.isTrue(await delegate.isActive(utils.blockTime()));
  });

  it("should not duplicate delegates", async () => {
    await governance.approveDelegate(delegate.address, { from: owner });
    const delegates = await governance.getDelegates();
    assert.equal(delegates.length, 1);
  });

  it("should be able to approve delegate by delegate approver", async () => {
    const delegate2 = await fixture.createDelegate("Delegate 2", owner);
    await governance.approveDelegate(delegate2.address, { from: delegateApprover });
    const delegates = await governance.getDelegates();
    assert.equal(delegates.length, 2);
  });

  it("should not be able to send keep alive if not owner", async () => {
    try {
      await delegate.keepAlive({ from: simpleUser });
      assert.fail("was able to sent keep alive from not owner");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to send keep alive from owner", async () => {
    await delegate.keepAlive({ from: delegateOwner });
    assert.equal(await delegate.getKeepAliveTimestamp(utils.blockTime()), utils.blockTime());
  });

  it("should be able to get composers", async () => {
    const stake = 100;
    await token.approve(delegate.address, stake, { from: delegateOwner });
    await delegate.stake(stake, { from: delegateOwner });
    await delegate.lockStake(stake, { from: delegateOwner });

    await utils.increaseTime(10);
    composersTime = utils.blockTime();
    const composers = await governance.getComposers(0, composersTime);
    assert.equal(composers.length, 1);
    assert.equal(composers[0], await delegate.aerum());
  });

  it("should not be able to update blacklisted from delegate", async () => {
    try {
      await delegate.updateBlacklist(false, { from: delegateOwner });
      assert.fail("was able to update blacklisted from delegate");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to update blacklisted by not owner", async () => {
    try {
      await governance.updateBlacklist(delegate.address, true, { from: delegateOwner });
      assert.fail("was able to update blacklisted by not owner");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to update blacklisted by owner", async () => {
    await utils.increaseTime(10);
    await governance.updateBlacklist(delegate.address, true, { from: owner });
    assert.isTrue(await delegate.isBlacklisted(utils.blockTime()));
  });

  it("should not be able to activate delegate from delegate", async () => {
    try {
      await delegate.setActive(false, { from: delegateOwner });
      assert.fail("was able to activate delegate from delegate");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to unregister delegate if not delegate owner", async () => {
    try {
      await delegate.deactivate({ from: simpleUser });
      assert.fail("was able to unregister delegate if not delegate owner");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to unregister delegate from governance", async () => {
    try {
      await governance.unregisterDelegate({ from: simpleUser });
      assert.fail("was able to unregister delegate from governance");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to unregister delegate", async () => {
    const balanceBefore = await token.balanceOf(delegateOwner);
    const delegateCountBefore = await governance.getDelegateCount();
    const bondBefore = await governance.bonds(delegate.address);
    assert.isTrue(bondBefore.greaterThan(0));
    assert.isTrue(await delegate.isActive(utils.blockTime()));

    await delegate.deactivate({ from: delegateOwner });

    const balanceAfter = await token.balanceOf(delegateOwner);
    const delegateCountAfter = await governance.getDelegateCount();
    assert.isTrue(balanceAfter.eq(balanceBefore.plus(bondBefore)));
    assert.isFalse(await delegate.isActive(utils.blockTime()));
    assert.isTrue(delegateCountAfter.eq(delegateCountBefore));
    assert.equal(await governance.bonds(delegate.address), 0);
  });

  it("should not be able to unregister delegate twice", async () => {
    try {
      await delegate.deactivate({ from: delegateOwner });
      assert.fail("was able to unregister delegate twice");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be returned from composers even after unregister", async () => {
    const composers = await governance.getComposers(0, composersTime);
    assert.equal(composers.length, 1);
    assert.equal(composers[0], await delegate.aerum());
  });

  it("should not be able to register delegate with no bond", async () => {
    try {
      await governance.approveDelegate(delegate.address, { from: owner });
      assert.fail("was able to register delegate with no bond");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to sent bond to unknown delegate", async () => {
    try {
      await token.approve(governance.address, 100, { from: delegateOwner });
      await governance.sendBond(simpleUser, 100, { from: delegateOwner });
      assert.fail("was able to sent bond to unknown delegate");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to bond back for unregistered delegate", async () => {
    const balanceBefore = await token.balanceOf(delegateOwner);

    await token.approve(governance.address, 100, { from: delegateOwner });
    await governance.sendBond(delegate.address, 100, { from: delegateOwner });
    assert.equal(await governance.bonds(delegate.address), 100);

    const balanceAfter = await token.balanceOf(delegateOwner);
    assert.isTrue(balanceAfter.eq(balanceBefore.minus(100)));
  });

  it("should be able to bond twice", async () => {
    await token.approve(governance.address, 100, { from: delegateOwner });
    await governance.sendBond(delegate.address, 100, { from: delegateOwner });
    assert.equal(await governance.bonds(delegate.address), 200);
  });

  it("should not be able to register delegate with no bond", async () => {
    const delegateCountBefore = await governance.getDelegateCount();
    assert.isFalse(await delegate.isActive(utils.blockTime()));

    await governance.approveDelegate(delegate.address, { from: owner });

    assert.isTrue(await delegate.isActive(utils.blockTime()));
    const delegateCountAfter = await governance.getDelegateCount();
    assert.isTrue(delegateCountAfter.eq(delegateCountBefore));
  });

});
