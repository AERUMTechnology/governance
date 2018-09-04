pragma solidity 0.4.24;

import "../token/AerumToken.sol";

contract AerumTokenSpender {

    uint256 public balance;
    AerumToken public token;

    constructor(AerumToken _token) public {
        token = _token;
    }

    function spend(address _sender, uint256 _amount) external {
        require(_amount > 0);

        token.transferFrom(_sender, address(this), _amount);
        balance += _amount;
    }
}