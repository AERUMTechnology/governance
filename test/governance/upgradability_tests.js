const utils = require("../utils");

const Governance = artifacts.require("Governance");
const GovernanceV2 = artifacts.require("GovernanceV2");
const Delegate = artifacts.require("Delegate");
const DelegateV2 = artifacts.require("DelegateV2");
const AerumToken = artifacts.require("AerumToken");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");

contract('governance > upgradeability', ([owner, admin, operator]) => {

  let token;

  let governanceProxy;
  let delegateProxy;

  before(async () => {
    token = await AerumToken.new();

    governanceProxy = await createProxy(Governance);
    await governanceProxy.init(owner, token.address, 100, 24 * 60 * 60, 10, 100);
    await governanceProxy.setUpgradeAdmin(admin);

    await token.transfer(operator, 1000);
  });

  async function createProxy(Contract) {
    const impl = await Contract.new();
    const proxy = await OwnedUpgradeabilityProxy.new(impl.address, { from: admin });
    return new Contract(proxy.address);
  }

  async function upgrade(proxyAddress, implAddress, from) {
    const proxy = new OwnedUpgradeabilityProxy(proxyAddress);
    await proxy.upgradeTo(implAddress, { from: from });
  }

  it("should be able to upgrade delegate with new storage", async () => {
    await token.approve(governanceProxy.address, 100, { from: operator });
    const tx = await governanceProxy.createDelegate("delegate1", operator, { from: operator });
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
    assert.equal(await governanceProxy.getMinBalance(utils.blockTime()), 100);
    const tokenBalanceBeforeUpgrade = await token.balanceOf(governanceProxy.address);
    await upgrade(governanceProxy.address, governanceV2.address, admin);
    
    // make sure get min balance implementation changed
    assert.equal(await governanceProxy.getMinBalance(utils.blockTime()), 200);
    const tokenBalanceAfterUpgrade = await token.balanceOf(governanceProxy.address);
    assert.isTrue(tokenBalanceAfterUpgrade.eq(tokenBalanceBeforeUpgrade));

    // here we need to use new governance contract otherwise we'll not find new event
    governanceProxy = new GovernanceV2(governanceProxy.address);
    await token.approve(governanceProxy.address, 100, { from: operator });
    const tx = await governanceProxy.createDelegate("delegate3", operator, { from: operator });
    const addr = utils.getEventArg(tx, "DelegateCreatedImpl", "impl");
    assert.notEqual(addr, null, 'failed to get new event');

    // make sure we still know about delegate
    assert.isTrue(await governanceProxy.knownDelegates(delegateProxy.address), 'governance should own delegate');
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
