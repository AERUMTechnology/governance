const fixture = require("./_fixture");
const BN = web3.utils.BN;

contract('airdrop > release batch', (accounts) => {

  let owner;
  let beneficiary1;
  let beneficiary2;
  let simpleUser;

  let token;
  let airdrop;

  before(async () => {
    await fixture.setUp(accounts);

    const fixtureAccounts = fixture.accounts();
    owner = fixtureAccounts.owner;
    beneficiary1 = fixtureAccounts.beneficiary1;
    beneficiary2 = fixtureAccounts.beneficiary2;
    simpleUser = fixtureAccounts.simpleUser;

    const contracts = fixture.contracts();
    token = contracts.token;
    airdrop = contracts.airdrop;

    await token.transfer(airdrop.address, 10000);
  });

  it("should be able to release batch", async () => {
    const promise1 = new BN(100);
    const promise2 = new BN(200);
    await airdrop.promiseBatch([beneficiary1, beneficiary2], [promise1, promise2], { from: owner });

    const balance1Before = await token.balanceOf(beneficiary1);
    const balance2Before = await token.balanceOf(beneficiary2);
    assert.isTrue((await airdrop.balance(beneficiary1)).eq(promise1));
    assert.isTrue((await airdrop.balance(beneficiary2)).eq(promise2));

    await airdrop.releaseBatch([beneficiary1, beneficiary2], { from: simpleUser });

    const balance1After = await token.balanceOf(beneficiary1);
    const balance2After = await token.balanceOf(beneficiary2);
    assert.isTrue((await airdrop.balance(beneficiary1)).eq(new BN(0)));
    assert.isTrue((await airdrop.balance(beneficiary2)).eq(new BN(0)));

    assert.isTrue(balance1After.eq(balance1Before.add(promise1)));
    assert.isTrue(balance2After.eq(balance2Before.add(promise2)));
  });

  it("should not release to unknown beneficiaries", async () => {
    const balanceBefore = await token.balanceOf(airdrop.address);
    await airdrop.releaseBatch([simpleUser]);
    const balanceAfter = await token.balanceOf(airdrop.address);
    assert.isTrue(balanceBefore.eq(balanceAfter));
  });

  it("should be able to release all", async () => {
    const promise1 = new BN(100);
    const promise2 = new BN(200);
    await airdrop.promiseBatch([beneficiary1, beneficiary2], [promise1, promise2], { from: owner });

    const balance1Before = await token.balanceOf(beneficiary1);
    const balance2Before = await token.balanceOf(beneficiary2);
    assert.isTrue((await airdrop.balance(beneficiary1)).eq(promise1));
    assert.isTrue((await airdrop.balance(beneficiary2)).eq(promise2));

    await airdrop.releaseAll({ from: simpleUser });

    const balance1After = await token.balanceOf(beneficiary1);
    const balance2After = await token.balanceOf(beneficiary2);
    assert.isTrue((await airdrop.balance(beneficiary1)).eq(new BN(0)));
    assert.isTrue((await airdrop.balance(beneficiary2)).eq(new BN(0)));

    assert.isTrue(balance1After.eq(balance1Before.add(promise1)));
    assert.isTrue(balance2After.eq(balance2Before.add(promise2)));
  });

  it("should be able to release batch (paged)", async () => {
    const promise1 = new BN(100);
    const promise2 = new BN(200);
    await airdrop.promiseBatch([beneficiary1, beneficiary2], [promise1, promise2], { from: owner });

    const balance1Before = await token.balanceOf(beneficiary1);
    const balance2Before = await token.balanceOf(beneficiary2);
    assert.isTrue((await airdrop.balance(beneficiary1)).eq(promise1));
    assert.isTrue((await airdrop.balance(beneficiary2)).eq(promise2));

    // NOTE: Start from 1 & take 10. So only beneficiary 2 should be affected
    await airdrop.releaseBatchPaged(1, 10, { from: simpleUser });

    const balance1After = await token.balanceOf(beneficiary1);
    const balance2After = await token.balanceOf(beneficiary2);
    assert.isTrue((await airdrop.balance(beneficiary1)).eq(promise1));
    assert.isTrue((await airdrop.balance(beneficiary2)).eq(new BN(0)));

    assert.isTrue(balance1After.eq(balance1Before));
    assert.isTrue(balance2After.eq(balance2Before.add(promise2)));
  });

});
