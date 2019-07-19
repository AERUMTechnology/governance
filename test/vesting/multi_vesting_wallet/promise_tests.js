const utils = require("../../utils");
const fixture = require("./_fixture");

contract('multi vesting wallet > promise', (accounts) => {

  let owner;
  let beneficiary1;
  let beneficiary2;
  let simpleUser;

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
  });

  it("should not be able to promise tokens by not owner", async () => {
    try {
      await vesting.promise(beneficiary1, 100, { from: simpleUser });
      assert.fail("was able to promise tokens by not owner");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to promise some tokens", async () => {
    assert.equal(await vesting.promised(beneficiary1), 0);
    assert.equal(await vesting.released(beneficiary1), 0);
    assert.equal(await vesting.revoked(beneficiary1), false);
    assert.equal(await vesting.known(beneficiary1), false);
    await vesting.promise(beneficiary1, 50, { from: owner });
    assert.equal(await vesting.promised(beneficiary1), 50);
    assert.equal(await vesting.released(beneficiary1), 0);
    assert.equal(await vesting.revoked(beneficiary1), false);
    assert.equal(await vesting.known(beneficiary1), true);
  });

  it("should be able to do few promises at the same time", async () => {
    await vesting.promiseBatch([beneficiary1, beneficiary2], [100, 200], { from: owner });
    assert.equal(await vesting.promised(beneficiary1), 100);
    assert.equal(await vesting.promised(beneficiary2), 200);
  });

  it("should not be able to promise list with different list lengths", async () => {
    try {
      await vesting.promiseBatch([beneficiary1, beneficiary2], [100, 200, 300], { from: owner });
      assert.fail("was able to promise list with different list lengths");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should return correct number of beneficiaries", async () => {
    const numberOfBeneficiaries = await vesting.getBeneficiariesCount();
    assert.isTrue(numberOfBeneficiaries.eq(2));
  });

  it("should return correct beneficiaries", async () => {
    const beneficiaries = await vesting.getBeneficiaries();
    assert.equal(beneficiaries.length, 2);
    assert.equal(beneficiaries[0], beneficiary1);
    assert.equal(beneficiaries[1], beneficiary2);
  });

});
