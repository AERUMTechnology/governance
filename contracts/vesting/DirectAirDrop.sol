pragma solidity 0.5.10;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

/**
 * @title AirDrop
 * @notice Contract which allows batch tokens drop
 */
contract DirectAirDrop is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    event TokensReturn(uint256 amount);

    ERC20 public token;

    uint256 public totalDropped;
    mapping(address => uint256) public dropped;

    /**
     * @notice Creates an airdrop contract
     * @param _token token being airdropped
     */
    constructor(address _token) public {
        require(_token != address(0));
        token = ERC20(_token);
    }

    /**
     * @notice Returns tokens to owner
     */
    function returnTokens() external onlyOwner {
        uint256 remaining = token.balanceOf(address(this));
        token.safeTransfer(owner(), remaining);

        emit TokensReturn(remaining);
    }

    /**
     * @notice Returns tokens amount on contract balance
     */
    function tokensBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    /**
     * @notice Drop tokens single to account
     * @param _beneficiary Account which gets tokens
     * @param _amount Amount of tokens
     */
    function drop(address _beneficiary, uint256 _amount) external onlyOwner {
        totalDropped = totalDropped.add(_amount);
        dropped[_beneficiary] = dropped[_beneficiary].add(_amount);
        token.safeTransfer(_beneficiary, _amount);
    }

    /**
     * @notice Drop tokens to list of accounts
     * @param _addresses Accounts which will get tokens
     * @param _amounts Promise amounts
     */
    function dropBatch(address[] calldata _addresses, uint256[] calldata _amounts) external onlyOwner {
        require(_addresses.length == _amounts.length);

        for (uint256 index = 0; index < _addresses.length; index++) {
            address beneficiary = _addresses[index];
            uint256 amount = _amounts[index];

            totalDropped = totalDropped.add(amount);
            dropped[beneficiary] = dropped[beneficiary].add(amount);
            token.safeTransfer(beneficiary, amount);
        }
    }
}
