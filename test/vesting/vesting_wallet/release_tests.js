const utils = require("../../utils");
const fixture = require("./_fixture");
const BN = web3.utils.BN;

contract('vesting wallet > release', (accounts) => {

  let beneficiary;

  let start;
  let duration;
  let tokensVested;
  let tokensInitBalance;

  let token;
  let vesting;

  before(async () => {
    await fixture.setUp(accounts);

    const fixtureAccounts = fixture.accounts();
    beneficiary = fixtureAccounts.beneficiary;

    const contracts = fixture.contracts();
    token = contracts.token;
    vesting = contracts.vesting;

    const variables = fixture.variables();
    tokensVested = variables.tokensVested;
    start = variables.start;
    duration = variables.duration;

    tokensInitBalance = await token.balanceOf(beneficiary);
  });

  it("releasable amount is 0 when cliff NOT started", async () => {
    // NOTE: Wait start of vesting
    await utils.increaseTime(30);

    assert.isTrue((await vesting.releasableAmount()).eq(new BN(0)));
  });

  it("should not be able to release when cliff NOT started", async () => {
    try {
      await vesting.release({ from: beneficiary });
      assert.fail("was able to release when cliff NOT started");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("releasable amount should be larger than 0 when cliff passed", async () => {
    // NOTE: Wait end of cliff
    await utils.increaseTime(40);

    const releasableAmount = await vesting.releasableAmount();
    const blockTime = await utils.blockTime();
    const timeFromVestingStart = blockTime - start;
    const vestingCompletionRate = timeFromVestingStart / duration;
    assert.isTrue(releasableAmount.eq(new BN(vestingCompletionRate * tokensVested)));
  });

  it("should be able to release when cliff passed", async () => {
    await vesting.release({ from: beneficiary });
    const tokensBalance = await token.balanceOf(beneficiary);
    assert.isTrue(tokensBalance.gt(tokensInitBalance));
  });

  it("releasable amount should be total when vesting period ended", async () => {
    // NOTE: Wait end of vesting
    await utils.increaseTime(50);

    const tokensReleased = await token.balanceOf(beneficiary);
    const releasableAmount = await vesting.releasableAmount();
    assert.equal(releasableAmount.add(tokensReleased).sub(tokensInitBalance), tokensVested);
    const tokenBalance = await token.balanceOf(vesting.address);
    assert.isTrue(tokenBalance.gt(new BN(0)));
  });

  it("should be able to release when cliff passed", async () => {
    await vesting.release({ from: beneficiary });
    const tokensBalance = await token.balanceOf(beneficiary);
    assert.equal(tokensBalance.sub(tokensInitBalance), tokensVested);
    assert.isTrue((await token.balanceOf(vesting.address)).eq(new BN(0)));
  });

});
