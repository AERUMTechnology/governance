const utils = require("../../utils");
const fixture = require("./_fixture");

const DirectAirDrop = artifacts.require("DirectAirDrop");

contract('direct airdrop > constructor', (accounts) => {

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
    const airdrop = await DirectAirDrop.new(token.address);
    assert.isTrue(!!airdrop, 'contract is not deployed');
    assert.equal(await airdrop.owner(), owner);
    assert.equal(await airdrop.token(), token.address);
  });

  it("contract token should not be empty", async () => {
    try {
      await DirectAirDrop.new(0);
      assert.fail("contract token address is empty");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

});
