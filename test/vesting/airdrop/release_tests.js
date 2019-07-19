const utils = require("../../utils");
const fixture = require("./_fixture");
const BN = web3.utils.BN;

contract('airdrop > release', (accounts) => {

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

    await airdrop.promiseBatch([beneficiary1, beneficiary2], [100, 200], { from: owner });
  });

  it("should not be able to release tokens by not beneficiary", async () => {
    const tokensBalanceBefore = await token.balanceOf(beneficiary1);
    await airdrop.release({ from: simpleUser });
    const tokensBalanceAfter = await token.balanceOf(beneficiary1);
    assert.isTrue(tokensBalanceBefore.eq(tokensBalanceAfter));
  });

  it("should not be able to release if there are no tokens", async () => {
    await token.transfer(airdrop.address, 50);
    try {
      await airdrop.release({ from: beneficiary1 });
      assert.fail("was able to release if there are no tokens");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to release in case there are tokens available", async () => {
    await token.transfer(airdrop.address, 50);
    const tokensBalanceBefore = await token.balanceOf(beneficiary1);
    await airdrop.release({ from: beneficiary1 });
    const tokensBalanceAfter = await token.balanceOf(beneficiary1);
    assert.isTrue(tokensBalanceBefore.add(new BN(100)).eq(tokensBalanceAfter));
  });

});
