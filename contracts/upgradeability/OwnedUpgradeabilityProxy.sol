pragma solidity 0.5.10;

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
     * @param _admin upgradeability admin.
     */
    constructor(address _implementation, address _admin) AdminUpgradeabilityProxy(_implementation, _admin, "") public {
    }

    /**
     * @notice Only fall back when the sender is not the admin.
     */
    function _willFallback() internal {
    }
}
