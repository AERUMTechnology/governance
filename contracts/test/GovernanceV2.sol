pragma solidity 0.4.24;

import "../library/OperationStore.sol";
import "../upgradeability/OwnedUpgradeabilityProxy.sol";
import "../governance/Delegate.sol";
import "../governance/Governance.sol";

/**
 * @title Governance V2 version to test upgradeability
 */
contract GovernanceV2 is Governance {
    using OperationStore for uint256[];

    event DelegateCreated(address indexed delegate, address indexed owner);
    event DelegateCreatedImpl(address indexed impl, address indexed owner);

    /**
    * @dev Get min balance for timestamp
    */
    function getMinBalance(uint256 _timestamp) external view returns (uint256) {
        // NOTE: This is test code used in unit tests
        return 2 * minBalance.getInt(_timestamp);
    }

    /**
    * @dev Create new delegate contract and transfer ownership to a caller
    * Generates new event so it can be tested
    */
    function createDelegate(bytes20 _name, address _aerum) external returns (address) {
        Delegate impl = new Delegate();
        OwnedUpgradeabilityProxy proxy = new OwnedUpgradeabilityProxy(impl);
        proxy.changeAdmin(upgradeAdmin);
        Delegate wrapper = Delegate(proxy);
        wrapper.init(msg.sender, token, _name, _aerum);

        address proxyAddr = address(wrapper);
        knownDelegates[proxyAddr] = true;

        emit DelegateCreated(proxyAddr, msg.sender);
        emit DelegateCreatedImpl(address(impl), msg.sender);
        return proxyAddr;
    }

}
