pragma solidity 0.5.10;

import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";

import "./IGovernance.sol";
import "./IDelegate.sol";
import "../library/OperationStore.sol";
import "../library/Conversions.sol";
import "../upgradeability/ParameterizedInitializable.sol";

/**
 * @title Ethereum-based contract for delegate
 */
contract Delegate is IDelegate, ParameterizedInitializable, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;
    using OperationStore for uint256[];
    using Conversions for bytes32;

    /** AER token **/
    ERC20 public token;

    /** Governance address **/
    IGovernance public governance;

    /** Aerum address used for coin distribution **/
    address public aerum;

    /** Description name of the delegate **/
    bytes32 public name;

    /** Aerum address per ethereum address in the delegate **/
    mapping(address => address) public stakerAerumAddress;

    /** Stake in the delegate **/
    uint256[] stakeDelegate;

    /** Stake per user address in the delegate **/
    mapping(address => uint256[]) stakeHistory;
    uint256[] blacklistHistory;
    uint256[] activationHistory;

    event AerumAddressUpdated(address aerum);
    event BlacklistUpdated(bool blocked);
    event IsActiveUpdated(bool active);

    event Staked(address indexed staker, uint256 amount);
    event Unstaked(address indexed staker, uint256 amount);

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
    * @param _governance Governance address
    * @param _name Delegate name
    * @param _aerum Delegate Aerum address
    */
    function init(address _owner, ERC20 _token, address _governance, bytes32 _name, address _aerum) initiator("v1") public {
        Ownable.initialize(_owner);
        token = _token;
        name = _name;
        aerum = _aerum;
        governance = IGovernance(_governance);
    }

    /**
    * @notice Returns delegate name as string
    */
    function getName() public view returns (string memory) {
        return name.bytes32ToString();
    }

    /**
    * @notice Sets Aerum address for specific staker
    * @param _aerum Aerum address
    */
    function setAerumAddress(address _aerum) external {
        require(stakeHistory[msg.sender].getInt(block.timestamp) > 0);
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
        token.safeTransferFrom(staker, address(this), _amount);
        uint256 stakeAtTimestamp = stakeHistory[staker].getInt(block.timestamp);
        stakeHistory[staker].storeInt(stakeAtTimestamp.add(_amount));
        stakeDelegate.storeInt(stakeDelegate.getInt(block.timestamp).add(_amount));
        emit Staked(staker, _amount);
    }

    /**
    * @notice Unstake specified amount of tokens from the delegate
    * @param _amount Amount to unstake
    */
    function unstake(uint256 _amount) external {
        address staker = msg.sender;
        uint256 stakeAtTimestamp = stakeHistory[staker].getInt(block.timestamp);
        require(stakeAtTimestamp >= _amount);
        require(token.balanceOf(address(this)).sub(_amount) >= 0);
        stakeHistory[staker].storeInt(stakeAtTimestamp.sub(_amount));
        stakeDelegate.storeInt(stakeDelegate.getInt(block.timestamp).sub(_amount));
        token.safeTransfer(staker, _amount);
        emit Unstaked(staker, _amount);
    }

    /**
    * @notice Return number of tokens staked by the specified staker
    * @param _staker Staker address
    * @param _timestamp Time for which we would like to check stake
    */
    function stakeOf(address _staker, uint256 _timestamp) external view returns (uint256) {
        return stakeHistory[_staker].getInt(_timestamp);
    }

    /**
    * @notice Delegate stake at the given timestamp
    * @param _timestamp Time for which we would like to check stake
    */
    function getStake(uint256 _timestamp) public view returns (uint256) {
        return stakeDelegate.getInt(_timestamp);
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

    /**
    * @notice Returns delegate's Aerum address
    */
    function getDelegateAerumAddress() external view returns (address) {
        return aerum;
    }

    /**
    * @notice Returns delegate's name as bytes32
    */
    function getNameAsBytes() external view returns (bytes32) {
        return name;
    }
}
