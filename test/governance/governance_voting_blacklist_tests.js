const utils = require("../utils");
const fixture = require("./_fixture");

contract('governance > blacklist voting', (accounts) => {

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

  const proposalId = '0x249aaf4d430d8a62b93c119a9b62f4a6800d398562a7c6b4ac957373f9cfb676';

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

    await token.approve(delegate1.address, 250, { from: staker1 });
    await token.approve(delegate2.address, 100, { from: staker2 });
    await token.approve(delegate3.address, 100, { from: staker3 });

    await delegate1.stake(250, { from: staker1 });
    await delegate2.stake(100, { from: staker2 });
    await delegate3.stake(100, { from: staker3 });

    governance.updateBlacklist(delegate1.address, true);
    governance.updateBlacklist(delegate2.address, true);
    governance.updateBlacklist(delegate3.address, true);
  });

  it("should not be able to propose in case you are not valid delegate", async () => {
    const delegates = await governance.getValidDelegates(await utils.blockTime());
    assert.equal(delegates[0].length, 0);

    try {
      await delegate1.submitBlacklistProposal(proposalId, delegate3.address, true, { from: delegate1Owner });
      assert.fail("was able to propose in case you are not valid delegate");
    } catch (e) {
      utils.assertVMError(e);
    }
  });
  
  it("should not be able to propose in case of not owner", async () => {
    governance.updateBlacklist(delegate1.address, false);
    const delegates = await governance.getValidDelegates(await utils.blockTime());
    assert.equal(delegates[0].length, 1);

    try {
      await delegate1.submitBlacklistProposal(proposalId, delegate3.address, true, { from: simpleUser });
      assert.fail("was able to propose in case of not owner");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to make proposal", async () => {
    await delegate1.submitBlacklistProposal(proposalId, delegate3.address, true, { from: delegate1Owner });
    const voting = await governance.getVotingDetails(proposalId);
    assert.equal(voting[0], proposalId);
    assert.equal(voting[3], 0);
    assert.equal(voting[5].length, 0);
    assert.equal(voting[6].length, 0);
  });

  it("should not be able to create new voting with existing id", async () => {
    try {
      await delegate1.submitBlacklistProposal(proposalId, delegate3.address, true, { from: delegate1Owner });
      assert.fail("was able to create new voting with existing id");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to vote in case of not valid delegate", async () => {
    try {
      await delegate2.vote(proposalId, true, { from: delegate2Owner });
      assert.fail("was able to vote in case of not valid delegate");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to vote", async () => {
    await governance.updateBlacklist(delegate2.address, false);
    await governance.updateBlacklist(delegate3.address, false);

    await delegate1.vote(proposalId, true, { from: delegate1Owner });
    await delegate2.vote(proposalId, false, { from: delegate2Owner });
    await delegate3.vote(proposalId, false, { from: delegate3Owner });

    const voting = await governance.getVotingDetails(proposalId);
    const voters = voting[5];
    assert.equal(voters.length, 3);
    assert.equal(voters[0], delegate1.address);
    assert.equal(voters[1], delegate2.address);
    assert.equal(voters[2], delegate3.address);
    const votings = voting[6];
    assert.equal(votings.length, 3);
    assert.equal(votings[0], true);
    assert.equal(votings[1], false);
    assert.equal(votings[2], false);
  });

  it("should not be able to vote twice", async () => {
    await delegate1.vote(proposalId, true, { from: delegate1Owner });
    await delegate2.vote(proposalId, true, { from: delegate2Owner });
    await delegate3.vote(proposalId, false, { from: delegate3Owner });

    const voting = await governance.getVotingDetails(proposalId);
    assert.equal(voting[5].length, 3);
    assert.equal(voting[6].length, 3);
  });

  it("should not be able to finalize before voting end", async () => {
    try {
      await delegate1.finalizeVoting(proposalId, { from: delegate1Owner });
      assert.fail("was able to finalize before voting end");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should not be able to vote after voting ended", async () => {
    await utils.increaseTime(60 * 60 * 24 * 7);
    try {
      await delegate1.vote(proposalId, true, { from: delegate1Owner });
      assert.fail("was able to vote after voting ended");
    } catch (e) {
      utils.assertVMError(e);
    }
  });

  it("should be able to finalize voting", async () => {
    assert.isTrue(await governance.isDelegateValid(delegate3.address, await utils.blockTime()));
    await delegate1.finalizeVoting(proposalId, { from: simpleUser });
    assert.isFalse(await governance.isDelegateValid(delegate3.address, await utils.blockTime()));
  });
});
