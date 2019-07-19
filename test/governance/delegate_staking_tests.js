const utils = require("../utils");
const fixture = require("./_fixture");
const BN = web3.utils.BN;

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
  let staker4;
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
    staker4 = fixtureAccounts.staker4;
    notStaker = fixtureAccounts.notStaker;
    delegate1Owner = fixtureAccounts.delegate1Owner;
    delegate2Owner = fixtureAccounts.delegate2Owner;
    delegate3Owner = fixtureAccounts.delegate3Owner;

    delegate1 = await fixture.createDelegate("Delegate1", delegate1Owner);
    delegate2 = await fixture.createDelegate("Delegate2", delegate2Owner);
    delegate3 = await fixture.createDelegate("Delegate3", delegate3Owner);

    await token.transfer(staker1, 1000, { from: owner });
    await token.transfer(staker2, 1000, { from: owner });
    await token.transfer(staker3, 1000, { from: owner });
    await token.transfer(staker4, 1000, { from: owner });
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
    assert.equal(await delegate1.stakeOf(staker1, await utils.blockTime()), 100);
    assert.isTrue((await delegate1.getStake(await utils.blockTime())).eq(new BN(100)));
  });

  it("several stakers should be able to deposit to a delegate", async () => {
    await token.approve(delegate1.address, 200, { from: staker2 });
    await delegate1.stake(200, { from: staker2 });
    assert.equal(await token.balanceOf(staker2).valueOf(), 800);
    assert.equal(await delegate1.stakeOf(staker2, await utils.blockTime()).valueOf(), 200);
    assert.isTrue((await delegate1.getStake(await utils.blockTime())).eq(new BN(300)));
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

  it("staker stake history should be correctly stored by time", async () => {
    await token.approve(delegate1.address, 200, { from: staker4 });
    
    const blocktime = await utils.blockTime();
    await utils.increaseTime(10);
    await delegate1.stake(200, { from: staker4 });
    assert.isTrue((await token.balanceOf(staker4).valueOf()).eq(new BN(800)));
    assert.isTrue((await delegate1.stakeOf(staker4, blocktime).valueOf()).eq(new BN(0)));
    assert.isTrue((await delegate1.stakeOf(staker4, await utils.blockTime()).valueOf()).eq(new BN(200)));
  });

  it("should not be able to unstake more tokens then initial stake", async () => {
    try {
      await delegate1.unstake(200, { from: staker1 });
      assert.fail("was able to unstake more tokens then initial stake");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to unstake tokens", async () => {
    await delegate1.unstake(100, { from: staker1 });
    assert.equal(await token.balanceOf(staker1), 1000);
    assert.isTrue((await delegate1.getStake(await utils.blockTime())).eq(new BN(400)));
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

});
