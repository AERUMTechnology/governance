const Bytes20Converter = artifacts.require("Bytes20Converter");

contract('conversions', () => {

  let converter;

  before(async () => {
    converter = await Bytes20Converter.new();
  });

  it("should be able to convert bytes20 to string", async () => {
    assert.equal(await converter.bytes20ToString("This is test message"), "This is test message");
    assert.equal(await converter.bytes20ToString("n0123456789"), "n0123456789");
    assert.equal(await converter.bytes20ToString(""), "");
  });

});