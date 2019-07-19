pragma solidity 0.5.10;

/**
 * @title Delegates factory interface
 */
contract IDelegateFactory {
    /**
    * @notice Create new delegate contract, get bond and transfer ownership to a caller
    * @param _name Delegate name
    * @param _aerum Delegate Aerum address
    * @param _governance Governance address
    * @param _owner Delegate owner
    * @param _aerum Delegate upgradeability admin
    */
    function createDelegate(bytes32 _name, address _aerum, address _governance, address _owner, address _upgradeAdmin) external returns (address, address);
}
