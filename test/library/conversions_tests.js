const utils = require("../utils");
const Bytes32Converter = artifacts.require("Bytes32Converter");

contract('conversions', () => {

  let converter;

  before(async () => {
    converter = await Bytes32Converter.new();
  });

  it("should be able to convert bytes32 to string", async () => {
    assert.equal(await converter.bytes32ToString(utils.asciiToHex("This is test message")), "This is test message");
    assert.equal(await converter.bytes32ToString(utils.asciiToHex("n0123456789")), "n0123456789");
    assert.equal(await converter.bytes32ToString(utils.asciiToHex("")), "");
  });
});