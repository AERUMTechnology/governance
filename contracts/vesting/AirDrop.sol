pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../governance/DelegateReference.sol";

/**
 * @title AirDrop
 * @notice Contract which allows batch tokens drop
 */
contract AirDrop is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    event Promise(address indexed account, uint256 amount);
    event Released(address indexed account, uint256 amount);
    event TokensReturn(uint256 amount);

    ERC20 public token;

    address[] public accounts;
    mapping(address => bool) public known;
    mapping(address => uint256) public balance;

    /**
     * @notice Creates an airdrop contract
     * @param _token token being airdropped
     */
    constructor(address _token) public {
        require(_token != address(0));
        token = ERC20(_token);
    }

    /**
     * @notice Transfers airdropped tokens to beneficiary.
     */
    function release() external {
        _release(msg.sender);
    }

    /**
     * @notice Transfers airdropped tokens to list of beneficiary.
     * @param _addresses List of beneficiaries
     */
    function releaseBatch(address[] _addresses) external {
        for (uint256 index = 0; index < _addresses.length; index++) {
            _release(_addresses[index]);
        }
    }

    /**
     * @notice Transfers airdropped tokens to batch of beneficiaries (starting 0)
     * @param _start Index of first beneficiary to release tokens
     * @param _count Number of beneficiaries to release tokens
     */
    function releaseBatchPaged(uint256 _start, uint256 _count) external {
        uint256 last = _start.add(_count);
        if (last > accounts.length) {
            last = accounts.length;
        }

        for (uint256 index = _start; index < last; index++) {
            _release(accounts[index]);
        }
    }

    /**
     * @notice Transfers airdropped tokens to all beneficiaries.
     */
    function releaseAll() external {
        for (uint256 index = 0; index < accounts.length; index++) {
            _release(accounts[index]);
        }
    }

    /**
     * @notice Internal transfer of airdropped tokens to beneficiary.
     */
    function _release(address _beneficiary) internal {
        uint256 amount = balance[_beneficiary];
        if (amount > 0) {
            balance[_beneficiary] = balance[_beneficiary].sub(amount);
            token.safeTransfer(_beneficiary, amount);

            emit Released(_beneficiary, amount);
        }
    }

    /**
     * @notice Returns tokens to owner
     */
    function returnRemaining() external onlyOwner {
        uint256 remaining = token.balanceOf(address(this));
        token.safeTransfer(owner, remaining);

        emit TokensReturn(remaining);
    }

    /**
     * @notice Sets promise to account
     * @param _beneficiary Account which gets tokens
     * @param _amount Amount of tokens
     */
    function promise(address _beneficiary, uint256 _amount) public onlyOwner {
        if (!known[_beneficiary]) {
            known[_beneficiary] = true;
            accounts.push(_beneficiary);
        }

        balance[_beneficiary] = _amount;

        emit Promise(_beneficiary, _amount);
    }

    /**
     * @notice Sets promise to list of account
     * @param _addresses Accounts which will get promises
     * @param _amounts Promise amounts
     */
    function promiseBatch(address[] _addresses, uint256[] _amounts) external onlyOwner {
        require(_addresses.length == _amounts.length);

        for (uint256 index = 0; index < _addresses.length; index++) {
            promise(_addresses[index], _amounts[index]);
        }
    }

    /**
    * @notice Calculates amount of tokens promised
    */
    function totalPromised() public view returns (uint256) {
        uint256 total = 0;

        for (uint256 index = 0; index < accounts.length; index++) {
            address account = accounts[index];
            total = total.add(balance[account]);
        }

        return total;
    }

    /**
     * @notice Returns full list if beneficiaries
     */
    function getBeneficiaries() external view returns (address[] memory) {
        return accounts;
    }

    /**
     * @notice Returns number of beneficiaries
     */
    function getBeneficiariesCount() external view returns (uint256) {
        return accounts.length;
    }

    /**
     * @notice Returns full list if beneficiaries with not empty balances
     */
    function getNotReleasedBeneficiaries() external view returns (address[] memory) {
        uint256 expectedCount = getNotReleasedBeneficiariesCount();
        address[] memory beneficiaries = new address[](expectedCount);

        uint256 notReleasedIndex = 0;
        for (uint256 index = 0; index < accounts.length; index++) {
            address beneficiary = accounts[index];
            if (balance[beneficiary] > 0) {
                beneficiaries[notReleasedIndex] = beneficiary;
                notReleasedIndex++;
            }
        }
        return beneficiaries;
    }

    /**
     * @notice Returns number of beneficiaries with not empty balances
     */
    function getNotReleasedBeneficiariesCount() public view returns (uint256) {
        uint256 count = 0;
        for (uint256 index = 0; index < accounts.length; index++) {
            if (balance[accounts[index]] > 0) {
                count++;
            }
        }
        return count;
    }
}
