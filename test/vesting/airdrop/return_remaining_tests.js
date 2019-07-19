const utils = require("../../utils");
const fixture = require("./_fixture");
const BN = web3.utils.BN;

contract('airdrop > return remaining', (accounts) => {

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

    await token.transfer(airdrop.address, 1000);
  });

  it("should not be able to withdraw remaining tokens by not owner", async () => {
    try {
      await airdrop.returnRemaining({ from: beneficiary1 });
      assert.fail('was not able to withdraw remaining tokens by not owner');
    } catch (e) {
      utils.assertVMError(e);
    }
  });
  
  it("owner should be able to return tokens", async () => {
    const balanceBefore = await token.balanceOf(owner);
    await airdrop.returnRemaining({ from: owner });
    const balanceAfter = await token.balanceOf(owner);
    const contractBalance = await token.balanceOf(airdrop.address);
    assert.isTrue(balanceAfter.eq(balanceBefore.add(new BN(1000))));
    assert.isTrue(contractBalance.eq(new BN(0)));
  });

});
