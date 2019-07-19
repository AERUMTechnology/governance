pragma solidity 0.4.24;

import "zos-lib/contracts/upgradeability/AdminUpgradeabilityProxy.sol";

/**
 * @title OwnedUpgradeabilityProxy
 * @notice This contract combines an upgradeability proxy with an authorization
 * mechanism for administrative tasks.
 * All external functions in this contract must be guarded by the
 * `ifAdmin` modifier. See ethereum/solidity#3864 for a Solidity
 * feature proposal that would enable this to be done automatically.
 */
contract OwnedUpgradeabilityProxy is AdminUpgradeabilityProxy {

    /**
     * Contract constructor.
     * It sets the `msg.sender` as the proxy administrator.
     * @param _implementation address of the initial implementation.
     */
    constructor(address _implementation) AdminUpgradeabilityProxy(_implementation, "") public {
    }

    /**
     * @notice Only fall back when the sender is not the admin.
     */
    function _willFallback() internal {
    }
}
