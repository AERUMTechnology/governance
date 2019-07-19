const utils = require("../utils");

const TestOperations = artifacts.require("TestOperations");

contract('operations', () => {

  let operations;

  before(async () => {
    operations = await TestOperations.new();
  });

  it("should be able to add / get bool values", async () => {
    const time1 = await utils.blockTime();
    assert.equal(await operations.getBool(time1), false);

    await utils.increaseTime(1);
    await operations.storeBool(true);
    const time2 = await utils.blockTime();
    assert.equal(await operations.getBool(time2), true);

    await utils.increaseTime(1);
    await operations.storeBool(false);
    const time3 = await utils.blockTime();
    assert.equal(await operations.getBool(time3), false);

    await utils.increaseTime(1);
    assert.equal(await operations.getBool(time1), false);
    assert.equal(await operations.getBool(time2), true);
    assert.equal(await operations.getBool(time3), false);
  });

  it("should be able to add / get int values", async () => {
    const time1 = await utils.blockTime();
    assert.equal(await operations.getInt(time1), 0);

    await utils.increaseTime(1);
    await operations.storeInt(38);
    const time2 = await utils.blockTime();
    assert.equal(await operations.getInt(time2), 38);

    await utils.increaseTime(1);
    await operations.storeInt(25);
    const time3 = await utils.blockTime();
    assert.equal(await operations.getInt(time3), 25);

    await utils.increaseTime(1);
    assert.equal(await operations.getInt(time1), 0);
    assert.equal(await operations.getInt(time2), 38);
    assert.equal(await operations.getInt(time3), 25);
  });

  it("should be able to add / get time values", async () => {
    const time1 = await utils.blockTime();
    assert.equal(await operations.getTimestamp(time1), 0);

    await utils.increaseTime(1);
    const time2 = await utils.blockTime();
    await operations.storeTimestamp(time2);
    assert.equal(await operations.getTimestamp(time2), time2);

    await utils.increaseTime(1);
    const time3 = await utils.blockTime();
    await operations.storeTimestamp(time3);
    assert.equal(await operations.getTimestamp(time3), time3);

    await utils.increaseTime(1);
    assert.equal(await operations.getTimestamp(time1), 0);
    assert.equal(await operations.getTimestamp(time2), time2);
    assert.equal(await operations.getTimestamp(time3), time3);
  });

});