const utils = require("../utils");
const fixture = require("./_fixture");

const Delegate = artifacts.require("Delegate");
const BN = web3.utils.BN;

contract('governance > create and manage delegate', (accounts) => {
  const delegateBond = (new BN(1000000)).mul((new BN(10)).pow(new BN(18)));
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
  });

  it("should not be able to create a delegate if bond not provided", async () => {
    await token.approve(governance.address, 10, { from: delegateOwner });
    try {
      await governance.createDelegate(utils.asciiToHex("delegate"), delegateOwner, { from: delegateOwner });
      assert.fail("was able to create a delegate if bond not provided");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to create a delegate", async () => {
    await token.approve(governance.address, delegateBond, { from: delegateOwner });
    const delegateName = "delegate";
    delegate = await fixture.createDelegate(delegateName, delegateOwner);
    assert.isTrue(await governance.knownDelegates(delegate.address));
    assert.isTrue((await governance.bonds(delegate.address)).eq(delegateBond));
    assert.equal(await delegate.getName(), delegateName);
  });

  it("should be able to get composers", async () => {
    const stake = 100;
    await token.approve(delegate.address, stake, { from: delegateOwner });
    await delegate.stake(stake, { from: delegateOwner });

    await utils.increaseTime(10);
    composersTime = await utils.blockTime();
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
    assert.isTrue(await delegate.isBlacklisted(await utils.blockTime()));
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

  it("should not be able to unregister blacklisted delegate from governance", async () => {
    try {
      await delegate.deactivate({ from: delegateOwner });
      assert.fail("was able to unregister blacklisted delegate from governance");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to unregister delegate", async () => {
    const balanceBefore = await token.balanceOf(delegateOwner);
    const delegateCountBefore = await governance.getDelegateCount();
    const bondBefore = await governance.bonds(delegate.address);
    await governance.updateBlacklist(delegate.address, false, { from: owner });
    assert.isFalse(await delegate.isBlacklisted(await utils.blockTime()));
    assert.isTrue(bondBefore.gt(0));
    assert.isTrue(await delegate.isActive(await utils.blockTime()));

    await delegate.deactivate({ from: delegateOwner });

    const balanceAfter = await token.balanceOf(delegateOwner);
    const delegateCountAfter = await governance.getDelegateCount();
    assert.isTrue(balanceAfter.eq(balanceBefore.add(bondBefore)));
    assert.isFalse(await delegate.isActive(await utils.blockTime()));
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

  it("should not be able to sent bond to unknown delegate", async () => {
    try {
      await token.approve(governance.address, delegateBond, { from: delegateOwner });
      await governance.sendBond(simpleUser, delegateBond, { from: delegateOwner });
      assert.fail("was able to sent bond to unknown delegate");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to bond back for unregistered delegate", async () => {
    const balanceBefore = await token.balanceOf(delegateOwner);

    await token.approve(governance.address, delegateBond, { from: delegateOwner });
    await governance.sendBond(delegate.address, delegateBond, { from: delegateOwner });
    assert.isTrue((await governance.bonds(delegate.address)).eq(delegateBond));

    const balanceAfter = await token.balanceOf(delegateOwner);
    assert.isTrue(balanceAfter.eq(balanceBefore.sub(delegateBond)));
  });

  it("should be able to bond twice", async () => {
    await token.approve(governance.address, delegateBond, { from: delegateOwner });
    await governance.sendBond(delegate.address, delegateBond, { from: delegateOwner });
    assert.isTrue((await governance.bonds(delegate.address)).eq(delegateBond.mul(new BN(2))));
  });
});
