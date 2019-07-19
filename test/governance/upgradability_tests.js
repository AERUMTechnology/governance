const utils = require("../utils");
const BN = web3.utils.BN;

const Governance = artifacts.require("Governance");
const GovernanceV2 = artifacts.require("GovernanceV2");
const Delegate = artifacts.require("Delegate");
const DelegateV2 = artifacts.require("DelegateV2");
const AerumToken = artifacts.require("AerumToken");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const DelegateFactory = artifacts.require("DelegateFactory");

contract('governance > upgradeability', ([owner, admin, operator]) => {
  const delegateBond = (new BN(1000000)).mul((new BN(10)).pow(new BN(18)));
  let token;
  let factory;

  let governanceProxy;
  let delegateProxy;

  before(async () => {
    token = await AerumToken.new();
    factory = await DelegateFactory.new(token.address);

    governanceProxy = await createProxy(Governance);
    await governanceProxy.init(owner, token.address, factory.address, 10, delegateBond);
    await governanceProxy.setUpgradeAdmin(admin);

    await token.transfer(operator, delegateBond);
  });

  async function createProxy(Contract) {
    const impl = await Contract.new();
    const proxy = await OwnedUpgradeabilityProxy.new(impl.address, admin, { from: admin });
    return new Contract(proxy.address);
  }

  async function upgrade(proxyAddress, implAddress, from) {
    const proxy = new OwnedUpgradeabilityProxy(proxyAddress);
    await proxy.upgradeTo(implAddress, { from: from });
  }

  it("should not be able to init governance twice", async () => {
    try {
      await governanceProxy.init(owner, token.address, factory.address, 10, 100);
      assert.fail("should have failed to upgrade governance twice");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to upgrade delegate with new storage", async () => {
    await token.approve(governanceProxy.address, delegateBond, { from: operator });
    const tx = await governanceProxy.createDelegate(utils.asciiToHex("delegate1"), operator, { from: operator });
    const delegateAddress = utils.getEventArg(tx, "DelegateCreated", "delegate");

    assert.equal(await new Delegate(delegateAddress).getName(), "delegate1");

    const delegateV2 = await DelegateV2.new();
    await upgrade(delegateAddress, delegateV2.address, admin);

    delegateProxy = new DelegateV2(delegateAddress);
    await delegateProxy.setName("delegate2", { from: operator });

    assert.equal(await delegateProxy.getName(), "delegate2");
  });
  
  it("should be able to upgrade governance with new events", async () => {
    const governanceV2 = await GovernanceV2.new();
    const tokenBalanceBeforeUpgrade = await token.balanceOf(governanceProxy.address);
    await upgrade(governanceProxy.address, governanceV2.address, admin);
    
    // make sure get min balance implementation changed
    const tokenBalanceAfterUpgrade = await token.balanceOf(governanceProxy.address);
    assert.isTrue(tokenBalanceAfterUpgrade.eq(tokenBalanceBeforeUpgrade));

    // here we need to use new governance contract otherwise we'll not find new event
    governanceProxy = new GovernanceV2(governanceProxy.address);
    await token.approve(governanceProxy.address, delegateBond, { from: operator });

    // init it again with v2
    await governanceProxy.init_v2("gov.v2");
    assert.equal(await governanceProxy.name(), "gov.v2");

    await token.approve(governanceProxy.address, delegateBond, { from: operator });
    const tx = await governanceProxy.createDelegate(utils.asciiToHex("delegate3"), operator, { from: operator });
    const addr = utils.getEventArg(tx, "DelegateCreatedImpl", "impl");
    assert.notEqual(addr, null, 'failed to get new event');

    // make sure we still know about delegate
    assert.isTrue(await governanceProxy.knownDelegates(delegateProxy.address), 'governance should own delegate');
  });

  it("should not be able to init governance v2 twice", async () => {
    try {
      await governanceProxy.init_v2("gov.v3");
      assert.fail("should have failed to upgrade governance v2 twice");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to upgrade contracts by not admin", async () => {
    try {
      const newImpl = await Governance.new();
      await upgrade(governanceProxy.address, newImpl.address, owner);
      assert.fail("should have failed to upgrade governance by root owner");
    } catch (e) {
      utils.assertVMError(e);
    }

    try {
      const newImpl = await Delegate.new();
      await upgrade(delegateProxy.address, newImpl.address, operator);
      assert.fail("should have failed to upgrade delegate by root owner");
    } catch (e) {
      utils.assertVMError(e);
    }
  });
});
