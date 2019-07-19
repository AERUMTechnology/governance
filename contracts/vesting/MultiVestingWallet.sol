pragma solidity 0.5.10;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../governance/IDelegate.sol";

/**
 * @title TokenVesting
 * @notice A token holder contract that can release its token balance gradually like a
 * typical vesting scheme, with a cliff and vesting period. Optionally revocable by the
 * owner.
 */
contract MultiVestingWallet is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    event Released(address indexed account, uint256 amount);
    event Revoked(address indexed account);
    event UnRevoked(address indexed account);
    event ReturnTokens(uint256 amount);
    event Promised(address indexed account, uint256 amount);
    event Stake(address indexed delegate, uint256 amount);
    event Unstake(address indexed delegate, uint256 amount);

    ERC20 public token;

    uint256 public cliff;
    uint256 public start;
    uint256 public duration;
    uint256 public staked;

    bool public revocable;

    address[] public accounts;
    mapping(address => bool) public known;
    mapping(address => uint256) public promised;
    mapping(address => uint256) public released;
    mapping(address => bool) public revoked;

    /**
     * @notice Creates a vesting contract that vests its balance of any ERC20 token to the
     * of the balance will have vested.
     * @param _token token being vested
     * @param _cliff duration in seconds of the cliff in which tokens will begin to vest
     * @param _start the time (as Unix time) at which point vesting starts
     * @param _duration duration in seconds of the period in which the tokens will vest
     * @param _revocable whether the vesting is revocable or not
     */
    constructor(
        address _token,
        uint256 _start,
        uint256 _cliff,
        uint256 _duration,
        bool _revocable
    )
    public
    {
        require(_token != address(0));
        require(_cliff <= _duration);

        token = ERC20(_token);
        revocable = _revocable;
        duration = _duration;
        cliff = _start.add(_cliff);
        start = _start;
    }

    /**
     * @notice Transfers vested tokens to beneficiary.
     */
    function release() external {
        _release(msg.sender);
    }

    /**
     * @notice Transfers vested tokens to list of beneficiary.
     * @param _addresses List of beneficiaries
     */
    function releaseBatch(address[] calldata _addresses) external {
        for (uint256 index = 0; index < _addresses.length; index++) {
            _release(_addresses[index]);
        }
    }

    /**
     * @notice Transfers vested tokens to batch of beneficiaries (starting 0)
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
     * @notice Transfers vested tokens to all beneficiaries.
     */
    function releaseAll() external {
        for (uint256 index = 0; index < accounts.length; index++) {
            _release(accounts[index]);
        }
    }

    /**
     * @notice Internal transfer of vested tokens to beneficiary.
     */
    function _release(address _beneficiary) internal {
        uint256 amount = releasableAmount(_beneficiary);
        if (amount > 0) {
            released[_beneficiary] = released[_beneficiary].add(amount);
            token.safeTransfer(_beneficiary, amount);

            emit Released(_beneficiary, amount);
        }
    }

    /**
     * @notice Allows the owner to revoke the vesting. Tokens already vested
     * remain in the contract, the rest are returned to the owner.
     * @param _beneficiary Account which will be revoked
     */
    function revoke(address _beneficiary) public onlyOwner {
        require(revocable);
        require(!revoked[_beneficiary]);

        promised[_beneficiary] = vestedAmount(_beneficiary);
        revoked[_beneficiary] = true;

        emit Revoked(_beneficiary);
    }

    /**
     * @notice Allows the owner to revoke the vesting for few addresses.
     * @param _addresses Accounts which will be unrevoked
     */
    function revokeBatch(address[] calldata _addresses) external onlyOwner {
        for (uint256 index = 0; index < _addresses.length; index++) {
            revoke(_addresses[index]);
        }
    }

    /**
     * @notice Allows the owner to unrevoke the vesting.
     * @param _beneficiary Account which will be unrevoked
     */
    function unRevoke(address _beneficiary) public onlyOwner {
        require(revocable);
        require(revoked[_beneficiary]);

        revoked[_beneficiary] = false;

        emit UnRevoked(_beneficiary);
    }

    /**
     * @notice Allows the owner to unrevoke the vesting for few addresses.
     * @param _addresses Accounts which will be unrevoked
     */
    function unrevokeBatch(address[] calldata _addresses) external onlyOwner {
        for (uint256 index = 0; index < _addresses.length; index++) {
            unRevoke(_addresses[index]);
        }
    }

    /**
     * @notice Calculates the amount that has already vested but hasn't been released yet.
     * @param _beneficiary Account which gets vested tokens
     */
    function releasableAmount(address _beneficiary) public view returns (uint256) {
        return vestedAmount(_beneficiary).sub(released[_beneficiary]);
    }

    /**
     * @notice Calculates the amount that has already vested.
     * @param _beneficiary Account which gets vested tokens
     */
    function vestedAmount(address _beneficiary) public view returns (uint256) {
        uint256 totalPromised = promised[_beneficiary];

        if (block.timestamp < cliff) {
            return 0;
        } else if (block.timestamp >= start.add(duration) || revoked[_beneficiary]) {
            return totalPromised;
        } else {
            return totalPromised.mul(block.timestamp.sub(start)).div(duration);
        }
    }

    /**
     * @notice Calculates the amount of free tokens in contract
     */
    function remainingBalance() public view returns (uint256) {
        uint256 tokenBalance = token.balanceOf(address(this));
        uint256 totalPromised = 0;
        uint256 totalReleased = 0;

        for (uint256 index = 0; index < accounts.length; index++) {
            address account = accounts[index];
            totalPromised = totalPromised.add(promised[account]);
            totalReleased = totalReleased.add(released[account]);
        }

        uint256 promisedNotReleased = totalPromised.sub(totalReleased);
        if (promisedNotReleased > tokenBalance) {
            return 0;
        }
        return tokenBalance.sub(promisedNotReleased);
    }

    /**
    * @notice Calculates amount of tokens promised
    */
    function totalPromised() public view returns (uint256) {
        uint256 total = 0;

        for (uint256 index = 0; index < accounts.length; index++) {
            address account = accounts[index];
            total = total.add(promised[account]);
        }

        return total;
    }

    /**
    * @notice Calculates amount of tokens released
    */
    function totalReleased() public view returns (uint256) {
        uint256 total = 0;

        for (uint256 index = 0; index < accounts.length; index++) {
            address account = accounts[index];
            total = total.add(released[account]);
        }

        return total;
    }

    /**
     * @notice Returns free tokens to owner
     */
    function returnRemaining() external onlyOwner {
        uint256 remaining = remainingBalance();
        require(remaining > 0);

        token.safeTransfer(owner(), remaining);

        emit ReturnTokens(remaining);
    }

    /**
     * @notice Returns all tokens to owner
     */
    function returnAll() external onlyOwner {
        uint256 remaining = token.balanceOf(address(this));
        token.safeTransfer(owner(), remaining);

        emit ReturnTokens(remaining);
    }

    /**
     * @notice Sets promise to account
     * @param _beneficiary Account which gets vested tokens
     * @param _amount Amount of tokens vested
     */
    function promiseSingle(address _beneficiary, uint256 _amount) public onlyOwner {
        if (!known[_beneficiary]) {
            known[_beneficiary] = true;
            accounts.push(_beneficiary);
        }

        promised[_beneficiary] = _amount;

        emit Promised(_beneficiary, _amount);
    }

    /**
     * @notice Sets promise to list of account
     * @param _addresses Accounts which will get promises
     * @param _amounts Promise amounts
     */
    function promiseBatch(address[] calldata _addresses, uint256[] calldata _amounts) external onlyOwner {
        require(_addresses.length == _amounts.length);

        for (uint256 index = 0; index < _addresses.length; index++) {
            promiseSingle(_addresses[index], _amounts[index]);
        }
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
     * @notice Stake specified amount of vested tokens to the delegate by the beneficiary
     */
    function stake(address _delegate, uint256 _amount) external onlyOwner {
        staked = staked.add(_amount);
        token.approve(_delegate, _amount);
        IDelegate(_delegate).stake(_amount);

        emit Stake(_delegate, _amount);
    }

    /**
     * @notice Unstake the given number of vested tokens by the beneficiary
     */
    function unstake(address _delegate, uint256 _amount) external onlyOwner {
        staked = staked.sub(_amount);
        IDelegate(_delegate).unstake(_amount);

        emit Unstake(_delegate, _amount);
    }
}
