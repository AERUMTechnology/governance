const utils = require("../../utils");
const fixture = require("./_fixture");

contract('airdrop > get methods', (accounts) => {

  let owner;
  let beneficiary1;
  let beneficiary2;

  let token;
  let airdrop;

  before(async () => {
    await fixture.setUp(accounts);

    const fixtureAccounts = fixture.accounts();
    owner = fixtureAccounts.owner;
    beneficiary1 = fixtureAccounts.beneficiary1;
    beneficiary2 = fixtureAccounts.beneficiary2;

    const contracts = fixture.contracts();
    token = contracts.token;
    airdrop = contracts.airdrop;

    await airdrop.promiseBatch([beneficiary1, beneficiary2], [100, 200], { from: owner });
    await token.transfer(airdrop.address, 1000);
  });

  it("should return total promised", async () => {
    const promised = await airdrop.totalPromised();
    assert.isTrue(promised.eq(300));
  });
  
  it("should be able to return not released beneficiaries", async () => {
    let count = await airdrop.getNotReleasedBeneficiariesCount();
    assert.isTrue(count.eq(2));

    let beneficiaries = await airdrop.getNotReleasedBeneficiaries();
    assert.isTrue(beneficiaries.length === 2);
    assert.isTrue(beneficiaries[0] === beneficiary1);
    assert.isTrue(beneficiaries[1] === beneficiary2);

    // NOTE: Decrease to 1
    await airdrop.promise(beneficiary1, 0, { from: owner });

    count = await airdrop.getNotReleasedBeneficiariesCount();
    assert.isTrue(count.eq(1));

    beneficiaries = await airdrop.getNotReleasedBeneficiaries();
    assert.isTrue(beneficiaries.length === 1);
    assert.isTrue(beneficiaries[0] === beneficiary2);

    // NOTE: Release all
    await airdrop.releaseAll({ from: owner });

    count = await airdrop.getNotReleasedBeneficiariesCount();
    assert.isTrue(count.eq(0));

    beneficiaries = await airdrop.getNotReleasedBeneficiaries();
    assert.isTrue(beneficiaries.length === 0);
  });

});
