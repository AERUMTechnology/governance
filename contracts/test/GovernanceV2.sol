pragma solidity 0.5.10;

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

    string public name;

    function init_v2(string memory _name) initiator("v2") public {
        name = _name;
    }

    /**
    * @dev Create new delegate contract and transfer ownership to a caller
    * Generates new event so it can be tested
    */
    function createDelegate(bytes32 _name, address _aerum) external returns (address) {
        Delegate impl = new Delegate();
        OwnedUpgradeabilityProxy proxy = new OwnedUpgradeabilityProxy(address(impl), upgradeAdmin);
        Delegate wrapper = Delegate(address(proxy));
        wrapper.init(msg.sender, token, address(this), _name, _aerum);

        address proxyAddr = address(wrapper);
        knownDelegates[proxyAddr] = true;

        emit DelegateCreated(proxyAddr, msg.sender);
        emit DelegateCreatedImpl(address(impl), msg.sender);
        return proxyAddr;
    }
}
