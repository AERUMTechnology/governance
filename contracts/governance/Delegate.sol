pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "zos-lib/contracts/Initializable.sol";

import "../library/OperationStore.sol";
import "../library/Conversions.sol";
import "./GovernanceReference.sol";
import "./DelegateReference.sol";

/**
 * @title Ethereum-based contract for delegate
 */
contract Delegate is DelegateReference, Initializable, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;
    using OperationStore for uint256[];
    using Conversions for bytes20;

    /** AER token **/
    ERC20 public token;

    /** Governance address **/
    GovernanceReference public governance;

    /** Aerum address used for coin distribution **/
    address public aerum;

    /** Description name of the delegate **/
    bytes20 public name;

    /** Stake per user address in the delegate **/
    mapping(address => uint256) public stakes;

    /** Aerum address per ethereum address in the delegate **/
    mapping(address => address) public stakerAerumAddress;

    /** Number of staked tokens locked to participate in coin distribution **/
    uint256 public lockedStake;

    uint256[] stakeHistory;
    uint256[] keepAliveHistory;
    uint256[] blacklistHistory;
    uint256[] activationHistory;

    event AerumAddressUpdated(address aerum);
    event KeepAlive(uint256 timestamp);
    event BlacklistUpdated(bool blocked);
    event IsActiveUpdated(bool active);

    event Staked(address indexed staker, uint256 amount);
    event Unstaked(address indexed staker, uint256 amount);
    event StakeLocked(uint256 amount);

    /** Check if the sender is a valid delegate **/
    modifier onlyGovernance {
        require(msg.sender == address(governance));
        _;
    }

    /** Check if the sender is a valid delegate or owner **/
    modifier onlyOwnerOrGovernance {
        require((msg.sender == address(governance)) || (msg.sender == owner()));
        _;
    }

    /** Check if delegate is approved **/
    modifier onlyForApprovedDelegate() {
        require(activationHistory.getBool(block.timestamp));
        _;
    }

    /**
    * @notice Delegate initializer
    * @dev This init is called by governance when created
    * @param _owner Delegate owner address
    * @param _token XRM token address
    * @param _name Delegate name
    * @param _aerum Delegate Aerum address
    */
    function init(address _owner, ERC20 _token, bytes20 _name, address _aerum) initializer public {
        Ownable.initialize(_owner);
        token = _token;
        name = _name;
        aerum = _aerum;
        governance = GovernanceReference(msg.sender);
    }

    /**
    * @notice Returns delegate name as string
    */
    function getName() public view returns (string) {
        return name.bytes20ToString();
    }

    /**
    * @notice Notify governance contract this delegate is still alive
    */
    function keepAlive() external onlyOwner {
        keepAliveHistory.storeTimestamp(block.timestamp);
        emit KeepAlive(block.timestamp);
    }

    /**
    * @notice Timestamp of the last keep alive message before the given timestamp
    * @param _timestamp Time for which we would like to check last keep alive call
    */
    function getKeepAliveTimestamp(uint256 _timestamp) public view returns (uint256) {
        return keepAliveHistory.getTimestamp(_timestamp);
    }

    /**
    * @notice Sets Aerum address for specific staker
    * @param _aerum Aerum address
    */
    function setAerumAddress(address _aerum) external {
        require(stakes[msg.sender] > 0);
        stakerAerumAddress[msg.sender] = _aerum;
        emit AerumAddressUpdated(_aerum);
    }

    /**
    * @notice Returns Aerum address for specific staker
    * @param _staker Staker address
    */
    function getAerumAddress(address _staker) external view returns (address) {
        return stakerAerumAddress[_staker];
    }

    /**
    * @notice Change delegate status in the blacklist
    * @param _blocked Is delegate blacklisted or not
    */
    function updateBlacklist(bool _blocked) external onlyGovernance {
        blacklistHistory.storeBool(_blocked);
        emit BlacklistUpdated(_blocked);
    }

    /**
    * @notice Whether this delegate was blacklisted at the given timestamp
    * @param _timestamp Time for which we would like to check blacklisted
    */
    function isBlacklisted(uint256 _timestamp) public view returns (bool) {
        return blacklistHistory.getBool(_timestamp);
    }

    /**
    * @notice Change delegate activations status
    * @param _active Is delegate active or not
    */
    function setActive(bool _active) external onlyGovernance {
        activationHistory.storeBool(_active);
        emit IsActiveUpdated(_active);
    }

    /**
    * @notice Whether this delegate was activated at the given timestamp
    * @param _timestamp Time for which we would like to check activation status
    */
    function isActive(uint256 _timestamp) external view returns (bool) {
        return activationHistory.getBool(_timestamp);
    }

    /**
    * @notice Deactivate delegate and return bond back
    */
    function deactivate() external onlyOwner {
        governance.unregisterDelegate();
    }

    /**
    * @notice Stake specified amount of tokens to the delegate to participate in coin distribution
    * @param _amount Amount to stake
    */
    function stake(uint256 _amount) external onlyForApprovedDelegate() {
        address staker = msg.sender;
        token.safeTransferFrom(staker, this, _amount);
        stakes[staker] = stakes[staker].add(_amount);
        emit Staked(staker, _amount);
    }

    /**
    * @notice Unstake specified amount of tokens from the delegate
    * @param _amount Amount to unstake
    */
    function unstake(uint256 _amount) external {
        address staker = msg.sender;
        require(stakes[staker] >= _amount);
        require(token.balanceOf(this).sub(_amount) >= lockedStake);
        token.safeTransfer(staker, _amount);
        stakes[staker] = stakes[staker].sub(_amount);
        emit Unstaked(staker, _amount);
    }

    /**
    * @notice Return number of tokens staked by the specified staker
    * @param _staker Staker address
    */
    function stakeOf(address _staker) external view returns (uint256) {
        return stakes[_staker];
    }

    /**
    * @notice Lock specified number of tokens in the Governance contract
    * @param _amount Amount to lock
    */
    function lockStake(uint256 _amount) external onlyOwnerOrGovernance {
        require(token.balanceOf(this) >= _amount);
        stakeHistory.storeInt(_amount);
        lockedStake = _amount;
        emit StakeLocked(_amount);
    }

    /**
    * @notice Delegate stake at the given timestamp
    * @param _timestamp Time for which we would like to check stake
    */
    function getStake(uint256 _timestamp) public view returns (uint256) {
        return stakeHistory.getInt(_timestamp);
    }

    /**
    * @notice Make a proposal to add/remove specified delegate to the blacklist
    * @param _id Proposal / voting id. Should be unique
    * @param _delegate Delegate which is affected by proposal
    * @param _blacklisted Blacklist or undo blacklist delegate
    */
    function submitBlacklistProposal(bytes32 _id, address _delegate, bool _blacklisted) external onlyOwner {
        governance.submitBlacklistProposal(_id, _delegate, _blacklisted);
    }

    /**
    * @notice Make a proposal to activate delegate. Can only be done delegate owner
    * @param _id Proposal / voting id
    */
    function submitActivateProposal(bytes32 _id) external onlyOwner {
        governance.submitActivateProposal(_id);
    }

    /**
    * @notice Vote in favor or against blacklist proposal with the specified identifier
    * @param _id Proposal / voting id
    * @param _inFavor Support or do not support proposal
    */
    function vote(bytes32 _id, bool _inFavor) external onlyOwner {
        governance.vote(_id, _inFavor);
    }

    /**
    * @notice Finalize voting and apply proposed changes if success.
    * This method will fail if voting period is not over.
    * @param _id Proposal / voting id
    */
    function finalizeVoting(bytes32 _id) external {
        governance.finalizeVoting(_id);
    }

}
