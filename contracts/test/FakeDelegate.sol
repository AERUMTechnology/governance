pragma solidity 0.5.10;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

/**
 * @title Fake delegate to test security
 */
contract FakeDelegate {

    ERC20 public token;

    constructor(ERC20 _token) public {
        token = _token;
    }

    /**
    * @dev Fake stake method to withdraw tokens
    * @param _amount Amount to be staked
    */
    function stake(uint256 _amount) external {
        require(token.transferFrom(msg.sender, address(this), _amount));
    }

    /**
    * @dev Fake unstake method
    */
    function unstake() external pure {}

    /**
    * @dev Fake set Aerum address method
    */
    function setAerumAddress() external pure {}

}
