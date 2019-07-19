pragma solidity 0.5.10;

/**
* @title Delegate reference to be used in other contracts
*/
interface IDelegate {
    /**
    * @notice Stake specified amount of tokens to the delegate to participate in coin distribution
    * @param _amount Amount to stake
    */
    function stake(uint256 _amount) external;

    /**
    * @notice Unstake specified amount of tokens from the delegate
    * @param _amount Amount to unstake
    */
    function unstake(uint256 _amount) external;

    /**
    * @notice Return number of tokens staked by the specified staker
    * @param _staker Staker address
    * @param _timestamp Time for which we would like to check stake
    */
    function stakeOf(address _staker, uint256 _timestamp) external view returns (uint256);

    /**
    * @notice Delegate stake at the given timestamp
    * @param _timestamp Time for which we would like to check stake
    */
    function getStake(uint256 _timestamp) external view returns (uint256);

    /**
    * @notice Sets Aerum address for specific staker
    * @param _aerum Aerum address
    */
    function setAerumAddress(address _aerum) external;

    /**
    * @notice Change delegate status in the blacklist
    * @param _blocked Is delegate blacklisted or not
    */
    function updateBlacklist(bool _blocked) external;

    /**
    * @notice Change delegate activations status
    * @param _active Is delegate active or not
    */
    function setActive(bool _active) external;

    /**
    * @notice Whether this delegate was activated at the given timestamp
    * @param _timestamp Time for which we would like to check activation status
    */
    function isActive(uint256 _timestamp) external view returns (bool);

    /**
    * @notice Delegate owner
    */
    function owner() external view returns(address);

    /**
    * @notice Whether this delegate was blacklisted at the given timestamp
    * @param _timestamp Time for which we would like to check blacklisted
    */
    function isBlacklisted(uint256 _timestamp) external view returns (bool);

    /**
    * @notice Returns delegate's Aerum address
    */
    function getDelegateAerumAddress() external view returns (address);

    /**
    * @notice Returns delegate's name as bytes32
    */
    function getNameAsBytes() external view returns (bytes32);
}
