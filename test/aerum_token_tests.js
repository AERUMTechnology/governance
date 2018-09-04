var AerumToken = artifacts.require("AerumToken");
var AerumTokenSpender = artifacts.require("AerumTokenSpender");

contract('AerumToken', (accounts) => {

  let token;
  let spender;

  before(async () => {
    token = await AerumToken.deployed();
    spender = await AerumTokenSpender.deployed();
  });

  it("Contract should exist", async () => {
    assert.isTrue(!!token, 'Contract is not deployed');
  });

  it("Should have correct supply", async () => {
    const totalSupply = await token.totalSupply();
    assert.equal(totalSupply.valueOf(), (1000 * 1000 * 1000) * Math.pow(10, 18), 'Total supply in not 100M');
  });

  it("Should call and approve", async () => {
    assert.equal(await spender.balance(), 0, 'Initial balance is 0');

    const amount = 1000;
    const payload = spender.contract.spend.getData(accounts[0], amount);
    await token.approveAndCall(AerumTokenSpender.address, amount, payload, { from: accounts[0] });

    assert.equal(await spender.balance(), amount);
  });

  it("Should be able to pause / unpause contract", async () => {
    await token.pause();
    let paused = await token.paused();
    assert.isTrue(paused, 'Cannot pause contact');

    await token.unpause();
    paused = await token.paused();
    assert.isFalse(paused, 'Cannot unpause contact');
  });

  it("Should be able to transfer funds", async () => {
    const initialBalanceOne = await token.balanceOf(accounts[0]);
    const initialBalanceTwo = await token.balanceOf(accounts[1]);

    const amount = 15 * Math.pow(10, 18);
    await token.transfer(accounts[1], amount);

    const currentBalanceOne = await token.balanceOf(accounts[0]);
    const currentBalanceTwo = await token.balanceOf(accounts[1]);

    assert.equal(currentBalanceOne.valueOf(), initialBalanceOne.valueOf() - amount, 'Sender balance is invalid');
    assert.equal(currentBalanceTwo.valueOf(), parseInt(initialBalanceTwo.valueOf()) + amount, 'Receiver balance is invalid');
  });

  it("Should NOT be able to transfer funds when token is paused", async () => {
    await token.pause();

    const amount = 15;
    try {
      await token.transfer(accounts[1], amount);
      assert.fail(0, 1, 'We should not get here');
    }
    catch(e) { }
  });
});
