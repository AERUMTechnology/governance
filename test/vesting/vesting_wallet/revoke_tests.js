const utils = require("../../utils");
const fixture = require("./_fixture");

const VestingWallet = artifacts.require("VestingWallet");

contract('vesting wallet > revoke', (accounts) => {

  let beneficiary;
  let owner;
  let simpleUser;

  let start;
  let duration;
  let revokeTime;
  let tokensVested;
  let tokensInitBalance;

  let token;
  let vesting;
  let delegate;
  let governance;

  before(async () => {
    await fixture.setUp(accounts);

    const fixtureAccounts = fixture.accounts();
    beneficiary = fixtureAccounts.beneficiary;
    owner = fixtureAccounts.owner;
    simpleUser = fixtureAccounts.simpleUser;

    const contracts = fixture.contracts();
    token = contracts.token;
    vesting = contracts.vesting;
    delegate = contracts.delegate;
    governance = contracts.governance;

    const variables = fixture.variables();
    tokensVested = variables.tokensVested;
    start = variables.start;
    duration = variables.duration;

    tokensInitBalance = await token.balanceOf(beneficiary);
  });

  it("should not be able to revoke not revokeable vesting", async () => {
    try {
      const unrevokeable = await VestingWallet.new(token.address, governance.address, beneficiary, 100, 100, 100, false);
      await unrevokeable.revoke({ from: owner });
      assert.fail("was able to revoke not revokeable vesting");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to revoke from not owner account", async () => {
    try {
      await vesting.revoke({ from: simpleUser });
      assert.fail("was able to revoke from not owner account");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to revoke vesting", async () => {
    // NOTE: Wait end of cliff
    await utils.increaseTime(70);

    assert.equal(await vesting.revoked(), false);
    const ownerBeforeRevoke = await token.balanceOf(owner);
    await vesting.revoke({ from: owner });
    assert.equal(await vesting.revoked(), true);
    const ownerAfterRevoke = await token.balanceOf(owner);
    assert.isTrue(ownerAfterRevoke.greaterThan(ownerBeforeRevoke));
    revokeTime = utils.blockTime();
  });

  it("should not be able to revoke twice", async () => {
    try {
      await vesting.revoke({ from: owner });
      assert.fail("was able to revoke twice");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to release more that fixed on revoke", async () => {
    // NOTE: Wait end of vesting
    await utils.increaseTime(50);

    const releasableAmount = await vesting.releasableAmount();
    const cliffTimeFromVestingStart = revokeTime - start;
    const vestingCompletionRateOnCliff = cliffTimeFromVestingStart / duration;
    assert.equal(releasableAmount, vestingCompletionRateOnCliff * tokensVested);
  });

  it("should be able to release after revoke", async () => {
    await vesting.release({ from: beneficiary });
    const tokensBalance = await token.balanceOf(beneficiary);
    assert.isTrue(tokensBalance.greaterThan(tokensInitBalance));
  });

  it("should not be able to revoke if more tokens staked than releasable", async () => {
    // NOTE: Create new vesting for next tests
    vesting = await VestingWallet.new(token.address, governance.address, beneficiary, utils.blockTime() + 10, 50, 100, true);
    await token.transfer(vesting.address, tokensVested);

    await vesting.stake(delegate.address, tokensVested, { from: beneficiary });
    assert.equal(await delegate.stakeOf(vesting.address), tokensVested);

    try {
      await vesting.revoke({ from: owner });
      assert.fail("was able to revoke if more tokens staked than releasable");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to unstake and revoke staked tokens", async () => {
    const ownerBalanceBeforeRevoke = await token.balanceOf(owner);
    // NOTE: We need unstake before we revoke
    await vesting.unstake(delegate.address, tokensVested, { from: owner });
    await vesting.revoke({ from: owner });
    assert.equal(await delegate.stakeOf(vesting.address), 0);
    assert.equal(await vesting.releasableAmount(), 0);

    const ownerBalanceAfterRevoke = await token.balanceOf(owner);
    const expectedOwnerBalanceAfterRevoke = ownerBalanceBeforeRevoke.plus(tokensVested);
    assert.isTrue(expectedOwnerBalanceAfterRevoke.eq(ownerBalanceAfterRevoke));
  });

});
