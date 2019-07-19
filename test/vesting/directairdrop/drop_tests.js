const utils = require("../../utils");
const fixture = require("./_fixture");

contract('direct airdrop > drop', (accounts) => {

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
  });

  it("should not be able to drop batch tokens in case there are no tokens on balance", async () => {
    try {
      await airdrop.dropBatch([beneficiary1, beneficiary2], [100, 200], { from: owner });
      assert.fail("was able to drop batch tokens in case there are no tokens on balance");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to drop tokens in case there are no tokens on balance", async () => {
    try {
      await airdrop.drop(beneficiary1, 100, { from: owner });
      assert.fail("was able to drop tokens in case there are no tokens on balance");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to drop batch tokens by not owner", async () => {
    await token.transfer(airdrop.address, 1000);
    try {
      await airdrop.dropBatch([beneficiary1, beneficiary2], [100, 200], { from: simpleUser });
      assert.fail("was able to drop batch tokens by not owner");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to drop tokens by not owner", async () => {
    try {
      await airdrop.drop(beneficiary1, 100, { from: simpleUser });
      assert.fail("was able to drop tokens by not owner");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to drop some tokens", async () => {
    const drop = 50;
    assert.equal(await airdrop.dropped(beneficiary1), 0);
    assert.equal(await airdrop.totalDropped(), 0);
    const balanceBefore = await token.balanceOf(beneficiary1);

    await airdrop.drop(beneficiary1, drop, { from: owner });

    assert.equal(await airdrop.dropped(beneficiary1), drop);
    assert.equal(await airdrop.totalDropped(), drop);
    const balanceAfter = await token.balanceOf(beneficiary1);
    assert.isTrue(balanceAfter.eq(balanceBefore.plus(drop)));
  });

  it("should be able to do few drops at the same time", async () => {
    const balanceBefore1 = await token.balanceOf(beneficiary1);
    const balanceBefore2 = await token.balanceOf(beneficiary2);

    await airdrop.dropBatch([beneficiary1, beneficiary2], [100, 200], { from: owner });

    assert.equal(await airdrop.dropped(beneficiary1), 150);
    assert.equal(await airdrop.dropped(beneficiary2), 200);
    assert.equal(await airdrop.totalDropped(), 350);

    const balanceAfter1 = await token.balanceOf(beneficiary1);
    const balanceAfter2 = await token.balanceOf(beneficiary2);
    assert.isTrue(balanceAfter1.eq(balanceBefore1.plus(100)));
    assert.isTrue(balanceAfter2.eq(balanceBefore2.plus(200)));
  });

  it("should not be able to withdraw tokens by not owner", async () => {
    try {
      await airdrop.returnTokens({ from: simpleUser });
      assert.fail("was able to withdraw tokens by not owner");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to do withdraw tokens back", async () => {
    const remaining = 650;
    assert.equal(await airdrop.tokensBalance(), remaining);
    assert.equal(await token.balanceOf(airdrop.address), remaining);
    const balanceBefore = await  token.balanceOf(owner);

    await airdrop.returnTokens({ from: owner });

    assert.equal(await airdrop.tokensBalance(), 0);
    assert.equal(await token.balanceOf(airdrop.address), 0);
    const balanceAfter = await  token.balanceOf(owner);
    assert.isTrue(balanceAfter.eq(balanceBefore.plus(remaining)));
  });

});
