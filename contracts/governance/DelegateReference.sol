pragma solidity 0.4.24;

/**
* @title Delegate reference to be used in other contracts
*/
interface DelegateReference {
    /**
    * @notice Stake specified amount of tokens to the delegate to participate in coin distribution
    */
    function stake(uint256 _amount) external;

    /**
    * @notice Unstake specified amount of tokens from the delegate
    */
    function unstake(uint256 _amount) external;

    /**
    * @notice Return number of tokens staked by the specified staker
    */
    function stakeOf(address _staker) external view returns (uint256);

    /**
    * @notice Sets Aerum address for delegate & calling staker
    */
    function setAerumAddress(address _aerum) external;
}
