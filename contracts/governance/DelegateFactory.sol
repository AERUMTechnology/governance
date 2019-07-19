pragma solidity 0.5.10;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "./IDelegateFactory.sol";
import "./Delegate.sol";
import "../upgradeability/OwnedUpgradeabilityProxy.sol";

/**
 * @title Delegates factory
 */
contract DelegateFactory {

    // TODO: Maybe, make upgradeable?
    ERC20 public token;

    constructor(address _token) public {
        require(_token != address(0));
        token = ERC20(_token);
    }

    /**
    * @notice Create new delegate contract, get bond and transfer ownership to a caller
    * @param _name Delegate name
    * @param _aerum Delegate Aerum address
    * @param _governance Governance address
    * @param _owner Delegate owner
    * @param _aerum Delegate upgradeability admin
    */
    function createDelegate(bytes32 _name, address _aerum, address _governance, address _owner, address _upgradeAdmin) external returns (address, address) {
        // Create delegate
        Delegate impl = new Delegate();
        // Setup delegate proxy
        OwnedUpgradeabilityProxy proxy = new OwnedUpgradeabilityProxy(address(impl), _upgradeAdmin);
        // Init delegate via proxy
        Delegate delegate = Delegate(address(proxy));
        delegate.init(_owner, token, _governance, _name, _aerum);
        // Return proxy and delegate addresses
        return (address(proxy), address(delegate));
    }
}
