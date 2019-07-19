pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/PausableToken.sol";

contract AerumToken is Ownable, PausableToken {

    string public name = "Aerum";
    string public symbol = "XRM";
    uint8 public decimals = 18;
    uint256 public initialSupply = 1000 * 1000 * 1000;

    constructor() public {
        totalSupply_ = initialSupply * (10 ** uint256(decimals));
        balances[owner] = totalSupply_;
    }

    /**
     * @notice Approves token transfer and executes other transaction
     * @param _spender Approved tokens spender
     * @param _value Amount of tokens approved
     * @param _data Next transaction payload
     */
    function approveAndCall(address _spender, uint256 _value, bytes _data) public payable returns (bool) {
        require(_spender != address(this));
        require(super.approve(_spender, _value));
        require(_spender.call(_data));
        return true;
    }
}