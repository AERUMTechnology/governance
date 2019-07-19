const utils = require("../../utils");
const fixture = require("./_fixture");

contract('multi vesting wallet > return remaining', (accounts) => {

  let owner;
  let beneficiary1;
  let beneficiary2;

  let token;
  let vesting;

  before(async () => {
    await fixture.setUp(accounts);

    const fixtureAccounts = fixture.accounts();
    owner = fixtureAccounts.owner;
    beneficiary1 = fixtureAccounts.beneficiary1;
    beneficiary2 = fixtureAccounts.beneficiary2;

    const contracts = fixture.contracts();
    token = contracts.token;
    vesting = contracts.vesting;

    await vesting.promiseBatch([beneficiary1, beneficiary2], [100, 200], { from: owner });
  });

  it("should not be able to withdraw remaining tokens by not owner", async () => {
    try {
      await vesting.returnRemaining({ from: beneficiary1 });
      assert.fail('was not able to withdraw remaining tokens by not owner');
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should return correct remaining balance", async () => {
    assert.equal(await vesting.remainingBalance(), 700);
  });
  
  it("owner should be able to withdraw remaining tokens", async () => {
    const initialBalance = await token.balanceOf(owner);
    await vesting.returnRemaining({ from: owner });
    assert.equal(await vesting.remainingBalance(), 0);
    const balance = await token.balanceOf(owner);
    assert.isTrue(balance.eq(initialBalance.plus(700)));
  });

  it("should not be able to return remaining twice", async () => {
    try {
      await vesting.returnRemaining({ from: owner });
      assert.fail('was able to return remaining twice');
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should return 0 remaining balance in case promised more tokens than contract contains", async () => {
    await vesting.promise(beneficiary1, 200, { from: owner });
    assert.equal(await vesting.remainingBalance(), 0);
  });

});
