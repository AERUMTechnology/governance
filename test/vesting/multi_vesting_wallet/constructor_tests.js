const utils = require("../../utils");
const fixture = require("./_fixture");

const MultiVestingWallet = artifacts.require("MultiVestingWallet");

contract('multi vesting wallet > constructor', (accounts) => {

  let owner;
  let token;

  before(async () => {
    await fixture.setUp(accounts);

    const fixtureAccounts = fixture.accounts();
    owner = fixtureAccounts.owner;

    const contracts = fixture.contracts();
    token = contracts.token;
  });

  it("contract should exist", async () => {
    const vesting = await MultiVestingWallet.new(token.address, 100, 100, 100, false);
    assert.isTrue(!!vesting, 'contract is not deployed');
    assert.equal(await vesting.owner(), owner);
    assert.equal(await vesting.token(), token.address);
    assert.equal(await vesting.start(), 100);
    assert.equal(await vesting.cliff(), 200);
    assert.equal(await vesting.duration(), 100);
    assert.equal(await vesting.revocable(), false);
  });

  it("contract token should not be empty", async () => {
    try {
      await MultiVestingWallet.new('0x0000000000000000000000000000000000000000', 100, 100, 100, false);
      assert.fail("contract token address is empty");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("contract cliff should not be longer than duration", async () => {
    try {
      await MultiVestingWallet.new(token.address, 100, 200, 100, false);
      assert.fail("contract cliff is longer than duration");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

});
