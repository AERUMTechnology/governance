const utils = require("../../utils");
const fixture = require("./_fixture");

contract('multi vesting wallet > release batch', (accounts) => {

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

  it("should be able to release batch", async () => {
    await utils.increaseTime(70);

    const balance1Before = await token.balanceOf(beneficiary1);
    const balance2Before = await token.balanceOf(beneficiary2);
    const releasable1Before = await vesting.releasableAmount(beneficiary1);
    const releasable2Before = await vesting.releasableAmount(beneficiary2);
    assert.isTrue(releasable1Before.greaterThan(0));
    assert.isTrue(releasable2Before.greaterThan(0));

    await vesting.releaseBatch([beneficiary1, beneficiary2], { from: simpleUser });

    const balance1After = await token.balanceOf(beneficiary1);
    const balance2After = await token.balanceOf(beneficiary2);
    const releasable1After = await vesting.releasableAmount(beneficiary1);
    const releasable2After = await vesting.releasableAmount(beneficiary2);
    assert.isTrue(releasable1Before.greaterThan(releasable1After));
    assert.isTrue(releasable2Before.greaterThan(releasable2After));

    assert.isTrue(balance1After.greaterThan(balance1Before));
    assert.isTrue(balance2After.greaterThan(balance2Before));
  });

  it("should not release to unknown beneficiaries", async () => {
    const balanceBefore = await token.balanceOf(vesting.address);
    await vesting.releaseBatch([simpleUser]);
    const balanceAfter = await token.balanceOf(vesting.address);
    assert.isTrue(balanceBefore.eq(balanceAfter));
  });

  it("should be able to release all", async () => {
    await utils.increaseTime(10);

    const balance1Before = await token.balanceOf(beneficiary1);
    const balance2Before = await token.balanceOf(beneficiary2);
    const releasable1Before = await vesting.releasableAmount(beneficiary1);
    const releasable2Before = await vesting.releasableAmount(beneficiary2);
    assert.isTrue(releasable1Before.greaterThan(0));
    assert.isTrue(releasable2Before.greaterThan(0));

    await vesting.releaseAll({ from: simpleUser });

    const balance1After = await token.balanceOf(beneficiary1);
    const balance2After = await token.balanceOf(beneficiary2);
    const releasable1After = await vesting.releasableAmount(beneficiary1);
    const releasable2After = await vesting.releasableAmount(beneficiary2);
    assert.isTrue(releasable1Before.greaterThan(releasable1After));
    assert.isTrue(releasable2Before.greaterThan(releasable2After));

    assert.isTrue(balance1After.greaterThan(balance1Before));
    assert.isTrue(balance2After.greaterThan(balance2Before));
  });

  it("should be able to release batch (paged)", async () => {
    await utils.increaseTime(10);

    const balance1Before = await token.balanceOf(beneficiary1);
    const balance2Before = await token.balanceOf(beneficiary2);
    const releasable1Before = await vesting.releasableAmount(beneficiary1);
    const releasable2Before = await vesting.releasableAmount(beneficiary2);
    assert.isTrue(releasable1Before.greaterThan(0));
    assert.isTrue(releasable2Before.greaterThan(0));

    // NOTE: Start from 1 & take 10. So only beneficiary 2 should be affected
    await vesting.releaseBatchPaged(1, 10, { from: simpleUser });

    await utils.increaseTime(1);

    const balance1After = await token.balanceOf(beneficiary1);
    const balance2After = await token.balanceOf(beneficiary2);
    const releasable1After = await vesting.releasableAmount(beneficiary1);
    const releasable2After = await vesting.releasableAmount(beneficiary2);
    assert.isTrue(releasable1Before.lessThan(releasable1After));
    assert.isTrue(releasable2Before.greaterThan(releasable2After));

    assert.isTrue(balance1After.eq(balance1Before));
    assert.isTrue(balance2After.greaterThan(balance2Before));
  });

});
