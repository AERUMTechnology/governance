pragma solidity 0.4.24;

/**
* @title Governance reference to be used in other contracts
*/
interface GovernanceReference {

    /**
    * @notice Make a proposal to add/remove specified delegate to the blacklist
    */
    function submitBlacklistProposal(bytes32 _id, address _delegate, bool _blacklisted) external;

    /**
    * @notice Make a proposal to add/remove specified delegate to the blacklist
    */
    function submitActivateProposal(bytes32 _id) external;

    /**
    * @notice Vote in favor or against blacklist proposal with the specified identifier
    */
    function vote(bytes32 _id, bool _inFavor) external;

    /**
    * @notice Finalize voting and apply proposed changes if success.
    * This method will fail if voting period is not over.
    */
    function finalizeVoting(bytes32 _id) external;

    /**
    * @notice Checks if delegate is known by governance (was created by governance)
    */
    function isDelegateKnown(address _delegate) external view returns (bool);

    /**
    * @notice Unregisters delegate
    */
    function unregisterDelegate() external;

}
