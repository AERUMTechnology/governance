const utils = require("../utils");
const fixture = require("./_fixture");

contract('governance > staking', (accounts) => {

  let token;
  let governance;
  let delegate1;
  let delegate2;
  let delegate3;

  let owner;
  let simpleUser;
  let staker1;
  let staker2;
  let staker3;
  let notStaker;
  let delegate1Owner;
  let delegate2Owner;
  let delegate3Owner;

  before(async () => {
    await fixture.setUp(accounts);

    const contracts = fixture.contracts();
    governance = contracts.governance;
    token = contracts.token;

    const fixtureAccounts = fixture.accounts();
    owner = fixtureAccounts.owner;
    simpleUser = fixtureAccounts.simpleUser;
    staker1 = fixtureAccounts.staker1;
    staker2 = fixtureAccounts.staker2;
    staker3 = fixtureAccounts.staker3;
    notStaker = fixtureAccounts.notStaker;
    delegate1Owner = fixtureAccounts.delegate1Owner;
    delegate2Owner = fixtureAccounts.delegate2Owner;
    delegate3Owner = fixtureAccounts.delegate3Owner;

    delegate1 = await fixture.createDelegate("Delegate1", delegate1Owner);
    delegate2 = await fixture.createDelegate("Delegate2", delegate2Owner);
    delegate3 = await fixture.createDelegate("Delegate3", delegate3Owner);

    await governance.approveDelegate(delegate1.address, { from: owner });
    await governance.approveDelegate(delegate2.address, { from: owner });
    await governance.approveDelegate(delegate3.address, { from: owner });

    await token.transfer(staker1, 1000, { from: owner });
    await token.transfer(staker2, 1000, { from: owner });
    await token.transfer(staker3, 1000, { from: owner });
  });

  it("should not be able to deposit without tokens", async () => {
    try {
      await delegate1.stake(100, { from: notStaker });
      assert.fail("was able to deposit without tokens");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to deposit to a delegate", async () => {
    await token.approve(delegate1.address, 100, { from: staker1 });
    await delegate1.stake(100, { from: staker1 });
    assert.equal(await token.balanceOf(staker1), 900);
    assert.equal(await delegate1.stakeOf(staker1), 100);
  });

  it("several stakers should be able to deposit to a delegate", async () => {
    await token.approve(delegate1.address, 200, { from: staker2 });
    await delegate1.stake(200, { from: staker2 });
    assert.equal(await token.balanceOf(staker2).valueOf(), 800);
    assert.equal(await delegate1.stakeOf(staker2).valueOf(), 200);
  });

  it("should be able to deposit to several delegates", async () => {
    await token.approve(delegate2.address, 500, { from: staker2 });
    await delegate2.stake(500, { from: staker2 });

    await token.approve(delegate2.address, 300, { from: staker3 });
    await delegate2.stake(300, { from: staker3 });

    assert.equal(await token.balanceOf(staker2).valueOf(), 300);
    assert.equal(await token.balanceOf(staker3).valueOf(), 700);
    assert.equal(await token.balanceOf(delegate2.address).valueOf(), 800);
  });

  it("should not be able to lock tokens by not owner", async () => {
    try {
      await delegate1.lockStake(100, { from: notStaker });
      assert.fail("was able to lock tokens by not owner");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to lock more tokens than available", async () => {
    try {
      await delegate1.lockStake(500, { from: delegate1Owner });
      assert.fail("was able to lock more tokens than available");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to lock tokens", async () => {
    assert.equal(await delegate1.lockedStake(), 0);
    await delegate1.lockStake(300, { from: delegate1Owner });
    assert.equal(await delegate1.lockedStake(), 300);
    assert.equal(await delegate1.getStake(utils.blockTime()), 300);
  });

  it("should not be able to withdraw locked tokens", async () => {
    try {
      await delegate1.unstake(100, { from: staker1 });
      assert.fail("was able to withdraw locked tokens");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to unlock tokens", async () => {
    await delegate1.lockStake(0, { from: delegate1Owner });
    assert.equal(await delegate1.lockedStake(), 0);
  });

  it("should not be able to withdraw more tokens then initial stake", async () => {
    try {
      await delegate1.unstake(200, { from: staker1 });
      assert.fail("was able to withdraw more tokens then initial stake");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to unstake tokens", async () => {
    await delegate1.unstake(100, { from: staker1 });
    assert.equal(await token.balanceOf(staker1), 1000);
  });

  it("should not be able to unstake tokens twice", async () => {
    try {
      await delegate1.unstake(100, { from: staker1 });
      assert.fail("was able to unstake tokens twice");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to set aerum address if there is no stake", async () => {
    try {
      await delegate1.setAerumAddress(simpleUser, { from: simpleUser });
      assert.fail("was able to set aerum address if there is no stake");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to set aerum address if staked before", async () => {
    await delegate1.setAerumAddress(simpleUser, { from: staker2 });
    assert.equal(await delegate1.getAerumAddress(staker2), simpleUser);
  });

  it("should not be able to lock stake from governance if not admin", async () => {
    try {
      await governance.lockStake(delegate1.address, 100, { from: delegate1Owner });
      assert.fail("was able to lock stake from governance if not admin");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to lock stake from governance", async () => {
    assert.equal(await delegate1.lockedStake(), 0);
    await governance.lockStake(delegate1.address, 100, { from: owner });
    assert.equal(await delegate1.lockedStake(), 100);
  });

  it("should not be able to stake in case delegate not approved", async () => {
    const delegate = await fixture.createDelegate("Not approved", delegate1Owner);
    await token.approve(delegate.address, 100, { from: staker1 });
    try {
      await delegate.stake(100, { from: staker1 });
      assert.fail("was able to stake in case delegate not approved");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

});
