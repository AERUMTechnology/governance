const utils = require("../../utils");
const fixture = require("./_fixture");

const FakeDelegate = artifacts.require("FakeDelegate");

contract('multi vesting wallet > staking', (accounts) => {

  let owner;
  let beneficiary1;
  let beneficiary2;
  let simpleUser;

  let token;
  let vesting;

  let delegate;

  before(async () => {
    await fixture.setUp(accounts);

    const fixtureAccounts = fixture.accounts();
    owner = fixtureAccounts.owner;
    beneficiary1 = fixtureAccounts.beneficiary1;
    beneficiary2 = fixtureAccounts.beneficiary2;
    simpleUser = fixtureAccounts.simpleUser;

    const contracts = fixture.contracts();
    token = contracts.token;
    vesting = contracts.vesting;
    delegate = contracts.delegate;

    await vesting.promiseBatch([beneficiary1, beneficiary2], [100, 200], { from: owner });
  });

  it("should not be able to stake from not owner", async () => {
    try {
      await vesting.stake(delegate.address, 1000, { from: simpleUser });
      assert.fail("was able to stake from not owner");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to stake from owner", async () => {
    assert.equal(await token.balanceOf(vesting.address), 1000);
    await vesting.stake(delegate.address, 1000, { from: owner });
    assert.equal(await token.balanceOf(vesting.address), 0);
  });

  it("should not be able to withdraw when staked", async () => {
    await utils.increaseTime(200);
    try {
      await vesting.release({ from: beneficiary1 });
      assert.fail("was able to withdraw when staked");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to unstake from not owner", async () => {
    try {
      await vesting.unstake(delegate.address, 1000, { from: simpleUser });
      assert.fail("was able to unstake from not owner");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to unstake from owner", async () => {
    assert.equal(await token.balanceOf(vesting.address), 0);
    await vesting.unstake(delegate.address, 1000, { from: owner });
    assert.equal(await token.balanceOf(vesting.address), 1000);
  });

  it("should be able to release after unstake", async () => {
    assert.equal(await token.balanceOf(beneficiary1), 0);
    await vesting.release({ from: beneficiary1 });
    assert.equal(await token.balanceOf(beneficiary1), 100);
  });

});
