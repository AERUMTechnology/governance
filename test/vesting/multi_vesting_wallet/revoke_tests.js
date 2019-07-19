const utils = require("../../utils");
const fixture = require("./_fixture");
const BN = web3.utils.BN;

const MultiVestingWallet = artifacts.require("MultiVestingWallet");

contract('multi vesting wallet > revoke', (accounts) => {

  let owner;
  let beneficiary1;
  let beneficiary2;
  let beneficiary3;
  let simpleUser;

  let duration;
  let start;
  let revokeTime;

  let token;
  let vesting;

  before(async () => {
    await fixture.setUp(accounts);

    const fixtureAccounts = fixture.accounts();
    owner = fixtureAccounts.owner;
    beneficiary1 = fixtureAccounts.beneficiary1;
    beneficiary2 = fixtureAccounts.beneficiary2;
    beneficiary3 = fixtureAccounts.beneficiary3;
    simpleUser = fixtureAccounts.simpleUser;

    const contracts = fixture.contracts();
    token = contracts.token;
    vesting = contracts.vesting;

    const variables = fixture.variables();
    start = variables.start;
    duration = variables.duration;

    await vesting.promiseBatch([beneficiary1, beneficiary2, beneficiary3], [100, 200, 300], { from: owner });
  });

  it("should not be able to revoke not revokeable vesting", async () => {
    try {
      const unrevokeable = await MultiVestingWallet.new(token.address, 100, 100, 100, false);
      await unrevokeable.revoke(beneficiary1, { from: owner });
      assert.fail("was able to revoke not revokeable vesting");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to unrevoke not revokeable vesting", async () => {
    try {
      const unrevokeable = await MultiVestingWallet.new(token.address, 100, 100, 100, false);
      await unrevokeable.unRevoke(beneficiary1, { from: owner });
      assert.fail("was able to unrevoke not revokeable vesting");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to revoke from not owner account", async () => {
    try {
      await vesting.revoke(beneficiary1, { from: simpleUser });
      assert.fail("was able to revoke from not owner account");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to revoke vesting", async () => {
    // NOTE: Wait end of cliff
    await utils.increaseTime(70);

    assert.equal(await vesting.revoked(beneficiary1), false);
    const remainingBalanceBefore = await vesting.remainingBalance();
    await vesting.revoke(beneficiary1, { from: owner });
    assert.equal(await vesting.revoked(beneficiary1), true);
    const remainingBalanceAfter = await vesting.remainingBalance();
    assert.isTrue(remainingBalanceAfter.gt(remainingBalanceBefore));
    revokeTime = await utils.blockTime();
  });

  it("should not be able to revoke twice", async () => {
    try {
      await vesting.revoke(beneficiary1, { from: owner });
      assert.fail("was able to revoke twice");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to revoke list", async () => {
    assert.equal(await vesting.revoked(beneficiary2), false);
    assert.equal(await vesting.revoked(beneficiary3), false);
    await vesting.revokeBatch([beneficiary2, beneficiary3], { from: owner });
    assert.equal(await vesting.revoked(beneficiary2), true);
    assert.equal(await vesting.revoked(beneficiary3), true);
  });

  it("should be able to release after revoke but before unrevoke", async () => {
    const tokensBalanceBefore = await token.balanceOf(beneficiary2);
    await vesting.release({ from: beneficiary2 });
    const tokensBalanceAfter = await token.balanceOf(beneficiary2);
    assert.isTrue(tokensBalanceAfter.gt(tokensBalanceBefore));
  });

  it("should be able to unrevoke", async () => {
    assert.equal(await vesting.revoked(beneficiary2), true);
    await vesting.unrevokeBatch([beneficiary2], { from: owner });
    assert.equal(await vesting.revoked(beneficiary2), false);
  });

  it("should not be able to unrevoke twice", async () => {
    try {
      await vesting.unRevoke(beneficiary2, { from: owner });
      assert.fail("was able to unrevoke twice");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to promise after unrevoke", async () => {
    await vesting.promiseSingle(beneficiary2, 210, { from: owner });
    assert.isTrue((await vesting.promised(beneficiary2)).eq(new BN(210)));
  });

  it("should not be able to release more that fixed on revoke", async () => {
    // NOTE: Wait end of vesting
    await utils.increaseTime(50);

    const releasableAmount = await vesting.releasableAmount(beneficiary1);
    const cliffTimeFromVestingStart = revokeTime - start;
    const vestingCompletionRateOnCliff = cliffTimeFromVestingStart / duration;
    assert.equal(releasableAmount, vestingCompletionRateOnCliff * 100);
  });

  it("should be able to release after revoke", async () => {
    const tokensBalanceBefore = await token.balanceOf(beneficiary1);
    await vesting.release({ from: beneficiary1 });
    const tokensBalanceAfter = await token.balanceOf(beneficiary1);
    const tokensReleased = tokensBalanceAfter.sub(tokensBalanceBefore);
    assert.isTrue(tokensReleased.gt(new BN(0)));
    assert.isTrue(tokensReleased.eq(await vesting.released(beneficiary1)));
  });

  it("should not be able to release twice", async () => {
    const tokensBalanceBefore = await token.balanceOf(beneficiary1);
    await vesting.release({ from: beneficiary1 });
    const tokensBalanceAfter = await token.balanceOf(beneficiary1);
    assert.isTrue(tokensBalanceBefore.eq(tokensBalanceAfter));
  });

  it("should be able to release second time after unrevoke", async () => {
    const tokensBalanceBefore = await token.balanceOf(beneficiary2);
    await vesting.release({ from: beneficiary2 });
    const tokensBalanceAfter = await token.balanceOf(beneficiary2);
    assert.isTrue(tokensBalanceAfter.gt(tokensBalanceBefore));
    assert.isTrue((await vesting.released(beneficiary2)).eq(new BN(210)));
  });
});
