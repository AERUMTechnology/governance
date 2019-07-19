const utils = require("../../utils");
const fixture = require("./_fixture");

contract('multi vesting wallet > release', (accounts) => {

  let owner;
  let beneficiary1;
  let beneficiary2;
  let simpleUser;

  let start;
  let duration;

  let token;
  let vesting;

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

    const variables = fixture.variables();
    start = variables.start;
    duration = variables.duration;

    await vesting.promiseBatch([beneficiary1, beneficiary2], [100, 200], { from: owner });
  });

  it("should not be able to see withdraw amount before cliff period", async () => {
    // NOTE: Wait till vesting started but cliff not ended
    await utils.increaseTime(40);

    assert.equal(await vesting.releasableAmount(beneficiary1), 0);
  });

  it("should be able to see withdraw amount after cliff period", async () => {
    // NOTE: Wait cliff ended
    await utils.increaseTime(20);

    const releasable = await vesting.releasableAmount(beneficiary1);
    assert.isTrue(releasable.greaterThan(0));

    const blockTime = utils.blockTime();
    const timeFromVestingStart = blockTime - start;
    const vestingCompletionRate = timeFromVestingStart / duration;
    assert.equal(releasable.toNumber(), vestingCompletionRate * 100, 'Actual: ' + releasable.toNumber());

    await utils.increaseTime(5);
    const secondReleasable = await vesting.releasableAmount(beneficiary1);
    assert.isTrue(secondReleasable.greaterThan(releasable));
  });

  it("should be able to withdraw something after cliff period", async () => {
    const releasableBeforeRelease = await vesting.releasableAmount(beneficiary1);

    assert.equal(await token.balanceOf(beneficiary1), 0);
    await vesting.release({ from: beneficiary1 });
    assert.isTrue((await token.balanceOf(beneficiary1)).greaterThan(0));

    const releasableAfterRelease = await vesting.releasableAmount(beneficiary1);
    assert.isTrue(releasableAfterRelease.lessThan(releasableBeforeRelease));
  });

  it("should not be able to release tokens by not beneficiary", async () => {
    const tokensBalanceBefore = await token.balanceOf(beneficiary1);
    await vesting.release({ from: simpleUser });
    const tokensBalanceAfter = await token.balanceOf(beneficiary1);
    assert.isTrue(tokensBalanceBefore.eq(tokensBalanceAfter));
  });

  it("should be able to see withdraw full amount after vesting ended", async () => {
    // NOTE: Wait vesting ended
    await utils.increaseTime(50);

    const releasable = await vesting.releasableAmount(beneficiary2);
    assert.equal(releasable, 200);
  });

});
