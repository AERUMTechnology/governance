const utils = require("../../utils");
const fixture = require("./_fixture");

const FakeDelegate = artifacts.require("FakeDelegate");

contract('vesting wallet > staking', (accounts) => {

  let beneficiary;
  let simpleUser;

  let token;
  let vesting;
  let delegate;
  let fakeDelegate;

  before(async () => {
    await fixture.setUp(accounts);

    const fixtureAccounts = fixture.accounts();
    beneficiary = fixtureAccounts.beneficiary;
    simpleUser = fixtureAccounts.simpleUser;

    const contracts = fixture.contracts();
    token = contracts.token;
    vesting = contracts.vesting;
    delegate = contracts.delegate;

    fakeDelegate = await FakeDelegate.new(token.address);
  });

  it("should not be able to stake from non beneficiary account", async () => {
    try {
      await vesting.stake(delegate.address, 20, { from: simpleUser });
      assert.fail("was able to stake from non beneficiary account");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to stake to not official delegate", async () => {
    try {
      await vesting.stake(fakeDelegate.address, 20, { from: beneficiary });
      assert.fail("was able to stake to not official delegate");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to stake using beneficiary account", async () => {
    await vesting.stake(delegate.address, 20, { from: beneficiary });
    assert.equal(await delegate.stakeOf(vesting.address), 20);
  });

  it("should not be able to set aerum address if not beneficiary", async () => {
    try {
      await vesting.setAerumAddress(delegate.address, beneficiary, { from: simpleUser });
      assert.fail("was able to set aerum address if not beneficiary");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to set aerum address to not official delegate", async () => {
    try {
      await vesting.setAerumAddress(fakeDelegate.address, beneficiary, { from: beneficiary });
      assert.fail("was able to set aerum address to not official delegate");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to set aerum address", async () => {
    assert.equal(await delegate.getAerumAddress(beneficiary), 0);
    await vesting.setAerumAddress(delegate.address, beneficiary, { from: beneficiary });
    assert.equal(await delegate.getAerumAddress(vesting.address), beneficiary);
  });

  it("should not be able to unstake from non beneficiary account", async () => {
    try {
      await vesting.unstake(delegate.address, 10, { from: simpleUser });
      assert.fail("was able to unstake from non beneficiary account");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to unstake to not official delegate", async () => {
    try {
      await vesting.unstake(fakeDelegate.address, 10, { from: beneficiary });
      assert.fail("was able to unstake to not official delegate");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to unstake using beneficiary account", async () => {
    await vesting.unstake(delegate.address, 10, { from: beneficiary });
    assert.equal(await delegate.stakeOf(vesting.address), 10);

    await vesting.unstake(delegate.address, 10, { from: beneficiary });
    assert.equal(await delegate.stakeOf(vesting.address), 0);
  });

  it("should not be able to unstake more than staked", async () => {
    try {
      await vesting.unstake(delegate.address, 10, { from: beneficiary });
      assert.fail("was able to unstake more than staked");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to stake too much tokens through vesting", async () => {
    try {
      await vesting.stake(delegate.address, 200, { from: beneficiary });
      assert.fail("was able to stake too much tokens through vesting");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

});
