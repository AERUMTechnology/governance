pragma solidity 0.5.10;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol";

contract AerumToken is Ownable, ERC20Pausable {

    string public name = "Aerum";
    string public symbol = "XRM";
    uint8 public decimals = 18;
    uint256 public initialSupply = 1000 * 1000 * 1000;

    constructor() public {
        _mint(owner(), initialSupply * (10 ** uint256(decimals)));
    }

    /**
     * @notice Approves token transfer and executes other transaction
     * @param _spender Approved tokens spender
     * @param _value Amount of tokens approved
     * @param _data Next transaction payload
     */
    function approveAndCall(address _spender, uint256 _value, bytes memory _data) public payable returns (bool) {
        require(_spender != address(this));
        require(super.approve(_spender, _value));
        (bool success,) = _spender.call(_data);
        require(success);

        return true;
    }
}
