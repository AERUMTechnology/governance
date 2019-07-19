pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "zos-lib/contracts/Initializable.sol";

import "../library/OperationStore.sol";
import "../upgradeability/OwnedUpgradeabilityProxy.sol";
import "./Delegate.sol";
import "./GovernanceReference.sol";

/**
 * @title Ethereum-based governance contract
 */
contract Governance is GovernanceReference, Initializable, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;
    using OperationStore for uint256[];

    /** Period when delegates can vote from proposal submission. Hardcoded to week */
    uint256 constant votingPeriod = 60 * 60 * 24 * 7;
    /** Number of Aerum blocks when composers are updated */
    uint256 constant delegatesUpdateAerumBlocksPeriod = 1000;
    /** Bond required for delegate to be registered. Should be set to 100k */
    uint256 public delegateBond;

    /** User used to upgrade governance or delegate contracts. Owner by default */
    address public upgradeAdmin;
    /** User which can approve delegates on initial phase. Owner by default */
    address public delegateApprover;
    /** Is delegate approver renounced. If yes we won't be able to set it again */
    bool public delegateApproverRenounced;

    /** XRM token */
    ERC20 public token;

    /** List of all delegates */
    address[] public delegates;
    /** Mapping of all known delegates. It's used to quickly check if it's known delegate */
    mapping(address => bool) public knownDelegates;
    /** List of bonds known by delegate */
    mapping(address => uint256) public bonds;

    /** Min stake required to be valid delegate. We should keep full history for consensus */
    uint256[] public minBalance;
    /** Keep alive duration in which delegate should call keep alive method to be valid. We should keep full history for consensus */
    uint256[] public keepAliveDuration;
    /** Composers count. We should keep full history for consensus */
    uint256[] public composersCount;

    enum VotingCategory { BLACKLIST, ACTIVATE }

    struct Voting {
        bytes32 id;
        VotingCategory category;
        uint256 timestamp;
        address delegate;
        bool proposal;
        mapping(address => bool) votes;
        address[] voters;
    }

    /** List of active votings */
    mapping(bytes32 => Voting) public votings;

    event UpgradeAdminUpdated(address admin);
    event DelegateApproverUpdated(address admin);
    event DelegateApproverRenounced();

    event MinBalanceUpdated(uint256 balance);
    event KeepAliveDurationUpdated(uint256 duration);
    event ComposersCountUpdated(uint256 count);
    event BlacklistUpdated(address indexed delegate, bool blocked);

    event DelegateCreated(address indexed delegate, address indexed owner);
    event DelegateApproved(address indexed delegate);
    event DelegateUnregistered(address indexed delegate);
    event BondSent(address indexed delegate, uint256 amount);
    event StakeLocked(address indexed delegate, uint256 amount);

    event ProposalSubmitted(bytes32 indexed id, address indexed author, address indexed delegate, VotingCategory category, bool proposal);
    event Vote(bytes32 indexed id, address indexed voter, bool inFavor);
    event VotingFinalized(bytes32 indexed id, bool voted, bool supported);

    /** Check if delegate is known **/
    modifier onlyOwnerOrDelegateApprover() {
        require((owner() == msg.sender) || (delegateApprover == msg.sender));
        _;
    }

    /** Check if delegate is known **/
    modifier onlyKnownDelegate(address delegate) {
        require(knownDelegates[delegate]);
        _;
    }

    /** Check if the sender is a valid delegate **/
    modifier onlyValidDelegate {
        require(isDelegateValid(msg.sender, block.timestamp));
        _;
    }

    /** Check if delegate approver active **/
    modifier onlyWhenDelegateApproverActive {
        require(!delegateApproverRenounced);
        _;
    }

    /**
    * @notice Governance initializer
    * @param _owner Governance owner address
    * @param _token XRM token address
    * @param _minBalance Min stake balance required for delegate to be valid
    * @param _keepAliveDuration Max keep alive duration when delegate should sent keep alive to be valid
    * @param _delegatesLimit Max delegates / composers limit at one point of time
    * @param _delegateBond Delegate bond to be sent to create new delegate
    */
    function init(
        address _owner, address _token,
        uint256 _minBalance, uint256 _keepAliveDuration, uint256 _delegatesLimit,
        uint256 _delegateBond
    ) initializer public {
        require(_owner != address(0));
        require(_token != address(0));

        Ownable.initialize(_owner);
        token = ERC20(_token);

        delegateBond = _delegateBond;
        delegateApprover = _owner;
        upgradeAdmin = _owner;

        minBalance.storeInt(_minBalance);
        keepAliveDuration.storeInt(_keepAliveDuration);
        composersCount.storeInt(_delegatesLimit);
    }

    /**
    * @notice Set admin who can upgrade delegate contracts
    * @param _admin New upgradeability admin
    */
    function setUpgradeAdmin(address _admin) external onlyOwner {
        upgradeAdmin = _admin;
        emit UpgradeAdminUpdated(_admin);
    }

    /**
    * @notice Set user who can approve delegates
    * @param _admin New delegate approver
    */
    function setDelegateApprover(address _admin) external onlyOwner onlyWhenDelegateApproverActive {
        delegateApprover = _admin;
        emit DelegateApproverUpdated(_admin);
    }

    /**
    * @notice Set user who can approve delegates
    */
    function renouncedDelegateApprover() external onlyOwner {
        delegateApproverRenounced = true;
        delegateApprover = address(0);
        emit DelegateApproverRenounced();
    }

    /**
    * @notice Set up minimum delegate balance necessary to participate in staking
    * @param _balance Minimum delegate balance
    */
    function setMinBalance(uint256 _balance) external onlyOwner {
        minBalance.storeInt(_balance);
        emit MinBalanceUpdated(_balance);
    }

    /**
    * @notice Set up duration between keep alive message and current time to consider delegate active
    * @param _duration Keep alive duration
    */
    function setKeepAliveDuration(uint256 _duration) external onlyOwner {
        keepAliveDuration.storeInt(_duration);
        emit KeepAliveDurationUpdated(_duration);
    }

    /**
    * @notice Set up limit of delegates / composers
    * @param _count Delegates / composers count
    */
    function setComposersCount(uint256 _count) external onlyOwner {
        composersCount.storeInt(_count);
        emit ComposersCountUpdated(_count);
    }

    /**
    * @notice Change delegate status in the blacklist
    * @param _delegate Delegate to be updated
    * @param _blocked Is delegate blocked or not
    */
    function updateBlacklist(address _delegate, bool _blocked) external onlyOwner onlyKnownDelegate(_delegate) {
        Delegate(_delegate).updateBlacklist(_blocked);
        emit BlacklistUpdated(_delegate, _blocked);
    }

    /**
    * @notice Get min balance for timestamp
    * @param _timestamp Time for which delegate is blocked or not
    */
    function getMinBalance(uint256 _timestamp) external view returns (uint256) {
        return minBalance.getInt(_timestamp);
    }

    /**
    * @notice Get keep alive duration for timestamp
    * @param _timestamp Time for which keep alive duration is returned
    */
    function getKeepAliveDuration(uint256 _timestamp) external view returns (uint256) {
        return keepAliveDuration.getInt(_timestamp);
    }

    /**
    * @notice Get delegates limit for timestamp
    * @param _timestamp Time for which composers count is returned
    */
    function getComposersCount(uint256 _timestamp) external view returns (uint256) {
        return composersCount.getInt(_timestamp);
    }

    /**
    * @notice locks delegate stake by owner
    * @param _delegate Delegate to lock stake
    * @param _amount Stake amount to lock
    */
    function lockStake(address _delegate, uint256 _amount) external onlyOwner onlyKnownDelegate(_delegate) {
        Delegate(_delegate).lockStake(_amount);
        emit StakeLocked(_delegate, _amount);
    }

    /**
    * @notice Create new delegate contract, get bond and transfer ownership to a caller
    * @param _name Delegate name
    * @param _aerum Delegate Aerum address
    */
    function createDelegate(bytes20 _name, address _aerum) external returns (address) {
        token.safeTransferFrom(msg.sender, address(this), delegateBond);

        Delegate impl = new Delegate();
        OwnedUpgradeabilityProxy proxy = new OwnedUpgradeabilityProxy(impl);
        proxy.changeAdmin(upgradeAdmin);
        Delegate wrapper = Delegate(proxy);
        wrapper.init(msg.sender, token, _name, _aerum);

        address proxyAddr = address(wrapper);
        knownDelegates[proxyAddr] = true;
        bonds[proxyAddr] = delegateBond;

        emit DelegateCreated(proxyAddr, msg.sender);

        return proxyAddr;
    }

    /**
    * @notice Register specified delegate by delegate approver
    * @param _delegate Delegate to be approved
    */
    function approveDelegate(address _delegate) external onlyOwnerOrDelegateApprover onlyKnownDelegate(_delegate) {
        approveDelegateInternal(_delegate);
    }

    /**
    * @notice Register specified delegate (by delegate approver or voting)
    * @param _delegate Delegate to be approved
    */
    function approveDelegateInternal(address _delegate) internal {
        require(bonds[_delegate] >= delegateBond);

        Delegate(_delegate).setActive(true);

        emit DelegateApproved(_delegate);

        for (uint256 index = 0; index < delegates.length; index++) {
            if (delegates[index] == _delegate) {
                // delegate already registered
                return;
            }
        }
        delegates.push(_delegate);
    }

    /**
    * @notice Unregister specified delegate. Can only be called by delegate itself
    */
    function unregisterDelegate() external onlyKnownDelegate(msg.sender) {
        address delegateAddr = msg.sender;
        Delegate delegate = Delegate(delegateAddr);
        require(delegate.isActive(block.timestamp));

        uint256 bond = bonds[delegateAddr];
        bonds[delegateAddr] = 0;
        token.safeTransfer(delegate.owner(), bond);
        delegate.setActive(false);

        emit DelegateUnregistered(delegateAddr);
    }

    /**
    * @notice Send bond for specified delegate, should be used when unregistered delegate wants to be registered again
    * @param _delegate Delegate which will receive bond
    * @param _amount Bond amount
    */
    function sendBond(address _delegate, uint256 _amount) external onlyKnownDelegate(_delegate) {
        token.safeTransferFrom(msg.sender, address(this), _amount);
        bonds[_delegate] = bonds[_delegate].add(_amount);
        emit BondSent(_delegate, _amount);
    }

    /**
    * @notice Whether specified delegate is known by governance, created by governance
    * @param _delegate Delegate address to check
    */
    function isDelegateKnown(address _delegate) public view returns (bool) {
        return knownDelegates[_delegate];
    }

    /**
    * @notice List of composers for the specified block number and timestamp. This method is used by AerumGo
    * @param _blockNum Aerum block number. Used for delegates list shifting
    * @param _timestamp Time at which composers list is requested
    */
    function getComposers(uint256 _blockNum, uint256 _timestamp) external view returns (address[]) {
        (address[] memory candidates,) = getValidDelegates(_timestamp);
        uint256 candidatesLength = candidates.length;

        uint256 limit = composersCount.getInt(_timestamp);
        if (candidatesLength < limit) {
            limit = candidatesLength;
        }

        address[] memory composers = new address[](limit);

        if (candidatesLength == 0) {
            return composers;
        }

        uint256 first = _blockNum.div(delegatesUpdateAerumBlocksPeriod) % candidatesLength;
        for (uint256 index = 0; index < limit; index++) {
            composers[index] = candidates[(first + index) % candidatesLength];
        }

        return composers;
    }

    /**
    * @notice List of all active delegates addresses
    */
    function getDelegates() public view returns (address[]) {
        return delegates;
    }

    /**
    * @notice Returns number of active delegates
    */
    function getDelegateCount() public view returns (uint256) {
        return delegates.length;
    }

    /**
    * @notice List of valid delegates which might be composers and their names
    * @param _timestamp Time at which delegates list is requested
    */
    function getValidDelegates(uint256 _timestamp) public view returns (address[], bytes20[]) {
        address[] memory array = new address[](delegates.length);
        uint16 length = 0;
        for (uint256 i = 0; i < delegates.length; i++) {
            if (isDelegateValid(delegates[i], _timestamp)) {
                array[length] = delegates[i];
                length++;
            }
        }
        address[] memory addresses = new address[](length);
        bytes20[] memory names = new bytes20[](length);
        for (uint256 j = 0; j < length; j++) {
            Delegate delegate = Delegate(array[j]);
            addresses[j] = delegate.aerum();
            names[j] = delegate.name();
        }
        return (addresses, names);
    }

    /**
    * @notice Returns valid delegates count
    */
    function getValidDelegateCount() public view returns (uint256) {
        (address[] memory validDelegates,) = getValidDelegates(block.timestamp);
        return validDelegates.length;
    }

    /**
    * @notice Whether specified delegate can be a composer
    * @param _delegate Delegate address to validate
    * @param _timestamp Time at which check is requested
    */
    function isDelegateValid(address _delegate, uint256 _timestamp) public view returns (bool) {
        if (!knownDelegates[_delegate]) {
            // Delegate not owned by this contract
            return false;
        }
        Delegate proxy = Delegate(_delegate);
        // Delegate has not been activated
        if (!proxy.isActive(_timestamp)) {
            return false;
        }
        // Delegate has not been blacklisted
        if (proxy.isBlacklisted(_timestamp)) {
            return false;
        }
        // Delegate has enough minimal stake to participate in consensus
        uint256 stake = proxy.getStake(_timestamp);
        if (stake < minBalance.getInt(_timestamp)) {
            return false;
        }
        // Delegate has produced a keep-alive message in last 24h
        uint256 lastKeepAlive = proxy.getKeepAliveTimestamp(_timestamp);
        return lastKeepAlive.add(keepAliveDuration.getInt(_timestamp)) >= block.timestamp;
    }

    /**
    * @notice Make a proposal to approved calling delegate
    * @param _id Voting id
    */
    function submitActivateProposal(bytes32 _id) external onlyKnownDelegate(msg.sender) {
        address delegate = msg.sender;
        require(!Delegate(delegate).isActive(block.timestamp));

        submitProposal(_id, delegate, VotingCategory.ACTIVATE, true);
    }

    /**
    * @notice Make a proposal to add/remove specified delegate to the blacklist
    * @param _id Voting id
    * @param _delegate Delegate affected by voting
    * @param _proposal Should be blacklisted on un blacklisted
    */
    function submitBlacklistProposal(bytes32 _id, address _delegate, bool _proposal) external onlyValidDelegate {
        submitProposal(_id, _delegate, VotingCategory.BLACKLIST, _proposal);
    }

    /**
    * @notice Make generic proposal
    * @param _id Voting id
    * @param _delegate Delegate affected by voting
    * @param _category Voting category: activate or blacklist
    * @param _proposal Should be blacklisted on un blacklisted
    */
    function submitProposal(bytes32 _id, address _delegate, VotingCategory _category, bool _proposal) internal {
        // make sure voting is unique
        require(votings[_id].id != _id);

        Voting memory voting = Voting({
            id : _id,
            category : _category,
            timestamp : block.timestamp,
            delegate : _delegate,
            proposal : _proposal,
            voters : new address[](0)
        });

        votings[_id] = voting;

        emit ProposalSubmitted(_id, msg.sender, _delegate, _category, _proposal);
    }

    /**
    * @notice Vote in favor or against proposal with the specified identifier
    * @param _id Voting id
    * @param _inFavor Support proposal or not
    */
    function vote(bytes32 _id, bool _inFavor) external onlyValidDelegate {
        Voting storage voting = votings[_id];
        // have specified blacklist voting
        require(voting.id == _id);
        // voting is still active
        require(voting.timestamp.add(votingPeriod) > block.timestamp);

        address voter = msg.sender;
        for (uint256 index = 0; index < voting.voters.length; index++) {
            if (voting.voters[index] == voter) {
                // delegate already voted
                return;
            }
        }

        voting.voters.push(voter);
        voting.votes[voter] = _inFavor;

        emit Vote(_id, voter, _inFavor);
    }

    /**
    * @notice Finalize voting and apply proposed changes if success.
    * This method will fail if voting period is not over.
    * @param _id Voting id
    */
    function finalizeVoting(bytes32 _id) external {
        bool voted;
        bool supported;
        Voting storage voting = votings[_id];
        // have specified blacklist voting
        require(voting.id == _id);
        // voting period if finished
        require(voting.timestamp.add(votingPeriod) <= block.timestamp);

        uint256 requiredVotesNumber = getValidDelegateCount() * 3 / 10;
        if (voting.voters.length >= requiredVotesNumber) {
            voted = true;
            uint256 proponents = 0;
            for (uint256 index = 0; index < voting.voters.length; index++) {
                if (voting.votes[voting.voters[index]]) {
                    proponents++;
                }
            }
            if (proponents * 2 > voting.voters.length) {
                supported = true;
                if (voting.category == VotingCategory.BLACKLIST) {
                    Delegate(voting.delegate).updateBlacklist(voting.proposal);
                }
                // NOTE: It's always true for activate
                if (voting.category == VotingCategory.ACTIVATE) {
                    approveDelegateInternal(voting.delegate);
                }
            }
        }

        delete votings[_id];

        emit VotingFinalized(_id, voted, supported);
    }

    /**
    * @notice Returns voting details by id
    * @param _id Voting id
    */
    function getVotingDetails(bytes32 _id) external view returns (bytes32, uint256, address, VotingCategory, bool, address[], bool[]) {
        Voting storage voting = votings[_id];
        address[] storage voters = voting.voters;

        bool[] memory votes = new bool[] (voters.length);
        for (uint256 index = 0; index < voters.length; index++) {
            votes[index] = voting.votes[voters[index]];
        }

        return (voting.id, voting.timestamp, voting.delegate, voting.category, voting.proposal, voters, votes);
    }

}
