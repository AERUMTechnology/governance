pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../governance/GovernanceReference.sol";
import "../governance/DelegateReference.sol";

/**
 * @title VestingWallet
 * @notice A token holder contract that can release its token balance gradually like a
 * typical vesting scheme, with a cliff and vesting period. Optionally revocable by the
 * owner.
 */
contract VestingWallet is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    event Released(uint256 amount);
    event Revoked();
    event Stake(address indexed delegate, uint256 amount);
    event Unstake(address indexed delegate, uint256 amount);

    GovernanceReference public governance;
    ERC20 public token;

    // beneficiary of tokens after they are released
    address public beneficiary;

    uint256 public cliff;
    uint256 public start;
    uint256 public duration;
    uint256 public staked;

    bool public revocable;

    uint256 public released;
    bool public revoked;

    /**
    * @notice Creates a vesting contract that vests its balance of any ERC20 token to the
    * _beneficiary, gradually in a linear fashion until _start + _duration. By then all
    * of the balance will have vested.
    * @param _token Aerum token which is being vested
    * @param _beneficiary address of the beneficiary to whom vested tokens are transferred
    * @param _cliff duration in seconds of the cliff in which tokens will begin to vest
    * @param _duration duration in seconds of the period in which the tokens will vest
    * @param _revocable whether the vesting is revocable or not
    */
    constructor(address _token, address _governance, address _beneficiary, uint256 _start, uint256 _cliff, uint256 _duration, bool _revocable) public {
        require(_token != address(0));
        require(_governance != address(0));
        require(_beneficiary != address(0));
        require(_cliff <= _duration);

        token = ERC20(_token);
        governance = GovernanceReference(_governance);

        beneficiary = _beneficiary;
        revocable = _revocable;
        duration = _duration;
        cliff = _start.add(_cliff);
        start = _start;
    }

    /**
     * @notice Modifier to check beneficiary only.
     */
    modifier onlyBeneficiary {
        require(msg.sender == beneficiary);
        _;
    }

    /**
     * @notice Modifier to check beneficiary or owner only.
     */
    modifier onlyOwnerOrBeneficiary {
        require((msg.sender == beneficiary) || (msg.sender == owner));
        _;
    }

    /**
     * @notice Transfers vested tokens to beneficiary.
     */
    function release() public {
        uint256 unreleased = releasableAmount();

        require(unreleased > 0);

        released = released.add(unreleased);

        token.safeTransfer(beneficiary, unreleased);

        emit Released(unreleased);
    }

    /**
     * @notice Allows the owner to revoke the vesting. Tokens already vested
     * remain in the contract, the rest are returned to the owner.
     */
    function revoke() public onlyOwner {
        require(revocable);
        require(!revoked);

        uint256 unreleased = releasableAmount();
        require(staked <= unreleased);

        uint256 balance = token.balanceOf(address(this));
        uint256 refund = balance.sub(unreleased);

        revoked = true;

        token.safeTransfer(owner, refund);

        emit Revoked();
    }

    /**
     * @notice Stake specified amount of vested tokens to the delegate by the beneficiary
     */
    function stake(address _delegate, uint256 _amount) external onlyBeneficiary {
        require(governance.isDelegateKnown(_delegate));
        staked = staked.add(_amount);
        token.approve(_delegate, _amount);
        DelegateReference(_delegate).stake(_amount);

        emit Stake(_delegate, _amount);
    }

    /**
     * @notice Unstake the given number of vested tokens by the beneficiary
     */
    function unstake(address _delegate, uint256 _amount) external onlyOwnerOrBeneficiary {
        require(governance.isDelegateKnown(_delegate));
        staked = staked.sub(_amount);
        DelegateReference(_delegate).unstake(_amount);

        emit Unstake(_delegate, _amount);
    }

    /**
     * @notice Sets Aerum address for specified delegate
     */
    function setAerumAddress(address _delegate, address _aerum) external onlyBeneficiary {
        require(governance.isDelegateKnown(_delegate));
        DelegateReference(_delegate).setAerumAddress(_aerum);
    }

    /**
     * @notice Calculates the amount that has already vested but hasn't been released yet.
     */
    function releasableAmount() public view returns (uint256) {
        return vestedAmount().sub(released);
    }

    /**
     * @notice Calculates the amount that has already vested.
     */
    function vestedAmount() public view returns (uint256) {
        uint256 currentBalance = token.balanceOf(address(this));
        uint256 totalBalance = currentBalance.add(staked).add(released);

        if (block.timestamp < cliff) {
            return 0;
        } else if (block.timestamp >= start.add(duration) || revoked) {
            return totalBalance;
        } else {
            return totalBalance.mul(block.timestamp.sub(start)).div(duration);
        }
    }
}
