pragma solidity 0.5.10;

import "../governance/Delegate.sol";

/**
 * @title Delegate V2 version to test upgradeability
 */
contract DelegateV2 is Delegate {

    /** Description of the delegate **/
    string description;

    /**
    * @dev Returns delegate name as string
    */
    function getName() public view returns (string memory) {
        return description;
    }

    /**
    * @dev Sets delegate name as string
    */
    function setName(string calldata _name) external onlyOwner {
        description = _name;
    }

}
