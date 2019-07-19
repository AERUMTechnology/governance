const utils = require("../utils");
const fixture = require("./_fixture");

contract('governance > composers', (accounts) => {

  let token;
  let governance;
  let delegate1;
  let delegate2;
  let delegate3;

  let owner;
  let simpleUser;
  let staker1;
  let staker2;
  let staker3;
  let notStaker;
  let delegate1Owner;
  let delegate2Owner;
  let delegate3Owner;

  let timestamp;

  before(async () => {
    await fixture.setUp(accounts);

    const contracts = fixture.contracts();
    governance = contracts.governance;
    token = contracts.token;

    const fixtureAccounts = fixture.accounts();
    owner = fixtureAccounts.owner;
    simpleUser = fixtureAccounts.simpleUser;
    staker1 = fixtureAccounts.staker1;
    staker2 = fixtureAccounts.staker2;
    staker3 = fixtureAccounts.staker3;
    notStaker = fixtureAccounts.notStaker;
    delegate1Owner = fixtureAccounts.delegate1Owner;
    delegate2Owner = fixtureAccounts.delegate2Owner;
    delegate3Owner = fixtureAccounts.delegate3Owner;

    delegate1 = await fixture.createDelegate("Delegate1", delegate1Owner);
    delegate2 = await fixture.createDelegate("Delegate2", delegate2Owner);
    delegate3 = await fixture.createDelegate("Delegate3", delegate3Owner);

    await token.transfer(staker1, 1000, { from: owner });
    await token.transfer(staker2, 1000, { from: owner });
    await token.transfer(staker3, 1000, { from: owner });

    await token.approve(delegate1.address, 100, { from: staker1 });
    await token.approve(delegate2.address, 200, { from: staker2 });
    await token.approve(delegate3.address, 300, { from: staker3 });

    await delegate1.stake(100, { from: staker1 });
    await delegate2.stake(200, { from: staker2 });
    await delegate3.stake(300, { from: staker3 });

    await governance.updateBlacklist(delegate2.address, true);
    await governance.updateBlacklist(delegate3.address, true);
  });

  it("delegate should be valid for the block before blacklist", async () => {
    timestamp = await utils.blockTime();
    await utils.increaseTime(1);
    await governance.updateBlacklist(delegate1.address, true);
    assert.isTrue(await governance.isDelegateValid(delegate1.address, timestamp));
  });

  it("delegate should be invalid when in blacklist", async () => {
    await utils.increaseTime(1);
    assert.isFalse(await governance.isDelegateValid(delegate1.address, await utils.blockTime()));
  });

  it("delegate should be valid once removed from the blacklist", async () => {
    await governance.updateBlacklist(delegate1.address, false);
    assert.isTrue(await governance.isDelegateValid(delegate1.address, await utils.blockTime()));
  });

  it("delegate should be valid for the block with enough tokens", async () => {
    timestamp = await utils.blockTime();
    await utils.increaseTime(1);
    assert.isTrue(await governance.isDelegateValid(delegate1.address, timestamp));
  });

  it("should return the same composers for the same time argument", async () => {
    timestamp = await utils.blockTime();
    let composers = await governance.getComposers(0, timestamp);
    assert.equal(composers.length, 1);
    assert.equal(composers[0], delegate1Owner);

    await utils.increaseTime(1);
    await governance.updateBlacklist(delegate2.address, false);

    composers = await governance.getComposers(0, timestamp);
    assert.equal(composers.length, 1);
    assert.equal(composers[0], delegate1Owner);

    timestamp = await utils.blockTime();
    composers = await governance.getComposers(0, timestamp);
    assert.equal(composers.length, 2);
    assert.equal(composers[0], delegate1Owner);
    assert.equal(composers[1], delegate2Owner);

    await utils.increaseTime(1);
    await governance.updateBlacklist(delegate1.address, true);
    composers = await governance.getComposers(0, timestamp);
    assert.equal(composers.length, 2);

    composers = await governance.getComposers(0, await utils.blockTime());
    assert.equal(composers.length, 1);
    assert.equal(composers[0], delegate2Owner);
  });

  it("should be able to change composer count", async () => {
    await governance.updateBlacklist(delegate1.address, false);
    await governance.updateBlacklist(delegate3.address, false);

    let composers = await governance.getComposers(2000, await utils.blockTime());
    assert.equal(composers.length, 3);

    await utils.increaseTime(1);
    await governance.setComposersCount(2);

    composers = await governance.getComposers(2000, await utils.blockTime());
    assert.equal(composers.length, 2);
  });

  it("should return composers in correct order", async () => {
    await governance.setComposersCount(3);

    let composers = await governance.getComposers(0, await utils.blockTime());
    assert.equal(composers.length, 3);
    assert.equal(composers[0], await delegate1.aerum());
    assert.equal(composers[1], await delegate2.aerum());
    assert.equal(composers[2], await delegate3.aerum());

    composers = await governance.getComposers(1000, await utils.blockTime());
    assert.equal(composers.length, 3);
    assert.equal(composers[0], await delegate2.aerum());
    assert.equal(composers[1], await delegate3.aerum());
    assert.equal(composers[2], await delegate1.aerum());

    composers = await governance.getComposers(2000, await utils.blockTime());
    assert.equal(composers.length, 3);
    assert.equal(composers[0], await delegate3.aerum());
    assert.equal(composers[1], await delegate1.aerum());
    assert.equal(composers[2], await delegate2.aerum());

    composers = await governance.getComposers(3000, await utils.blockTime());
    assert.equal(composers.length, 3);
    assert.equal(composers[0], await delegate1.aerum());
    assert.equal(composers[1], await delegate2.aerum());
    assert.equal(composers[2], await delegate3.aerum());

    composers = await governance.getComposers(4000, await utils.blockTime());
    assert.equal(composers.length, 3);
    assert.equal(composers[0], await delegate2.aerum());
    assert.equal(composers[1], await delegate3.aerum());
    assert.equal(composers[2], await delegate1.aerum());
  });

});
