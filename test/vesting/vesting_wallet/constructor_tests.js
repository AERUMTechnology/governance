const utils = require("../../utils");
const fixture = require("./_fixture");

const VestingWallet = artifacts.require("VestingWallet");

contract('vesting wallet > constructor', (accounts) => {

  let beneficiary;
  let owner;

  let token;
  let governance;

  before(async () => {
    await fixture.setUp(accounts);

    const fixtureAccounts = fixture.accounts();
    beneficiary = fixtureAccounts.beneficiary;
    owner = fixtureAccounts.owner;

    const contracts = fixture.contracts();
    token = contracts.token;
    governance = contracts.governance;
  });

  it("contract should exist", async () => {
    const vesting = await VestingWallet.new(token.address, governance.address, beneficiary, 100, 100, 100, false);
    assert.isTrue(!!vesting, 'contract is not deployed');
    assert.equal(await vesting.owner(), owner);
    assert.equal(await vesting.beneficiary(), beneficiary);
    assert.equal(await vesting.token(), token.address);
    assert.equal(await vesting.governance(), governance.address);
    assert.equal(await vesting.start(), 100);
    assert.equal(await vesting.cliff(), 200);
    assert.equal(await vesting.duration(), 100);
    assert.equal(await vesting.revocable(), false);
    assert.equal(await vesting.revoked(), false);
  });

  it("contract token address should not be empty", async () => {
    try {
      await VestingWallet.new('0x0000000000000000000000000000000000000000', governance.address, beneficiary, 100, 100, 100, false);
      assert.fail("contract token is empty");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("contract governance should not be empty", async () => {
    try {
      await VestingWallet.new(token.address, '0x0000000000000000000000000000000000000000', beneficiary, 100, 100, 100, false);
      assert.fail("contract governance is empty");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("contract beneficiary should not be empty", async () => {
    try {
      await VestingWallet.new(token.address, governance.address, '0x0000000000000000000000000000000000000000', 100, 100, 100, false);
      assert.fail("contract beneficiary is empty");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("contract cliff should not be longer than duration", async () => {
    try {
      await VestingWallet.new(token.address, governance.address, beneficiary, 100, 200, 100, false);
      assert.fail("contract cliff is longer than duration");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

});
