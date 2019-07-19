pragma solidity 0.5.10;

/**
* @title Governance reference to be used in other contracts
*/
interface IGovernance {
    /**
    * @notice Set voting period
    * @param _votingPeriod New voting period
    */
    function setVotingPeriod(uint256 _votingPeriod) external;

    /**
    * @notice Make a proposal to add/remove specified delegate to the blacklist
    * @param _id Voting id
    * @param _delegate Delegate affected by voting
    * @param _proposal Should be blacklisted on un blacklisted
    */
    function submitBlacklistProposal(bytes32 _id, address _delegate, bool _proposal) external;

   /**
   * @notice Vote in favor or against proposal with the specified identifier
   * @param _id Voting id
   * @param _inFavor Support proposal or not
   */
    function vote(bytes32 _id, bool _inFavor) external;

    /**
    * @notice Finalize voting and apply proposed changes if success.
    * This method will fail if voting period is not over.
    * @param _id Voting id
    */
    function finalizeVoting(bytes32 _id) external;

    /**
     * @notice Whether specified delegate is known by governance, created by governance
     * @param _delegate Delegate address to check
     */
    function isDelegateKnown(address _delegate) external view returns (bool);

    /**
    * @notice Unregister specified delegate. Can only be called by delegate itself
    */
    function unregisterDelegate() external;

}
