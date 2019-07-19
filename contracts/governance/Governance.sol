pragma solidity 0.5.10;

import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";

import "./IDelegate.sol";
import "./IGovernance.sol";
import "./IDelegateFactory.sol";
import "../library/OperationStore.sol";
import "../upgradeability/OwnedUpgradeabilityProxy.sol";
import "../upgradeability/ParameterizedInitializable.sol";

/**
 * @title Ethereum-based governance contract
 */
contract Governance is IGovernance, ParameterizedInitializable, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;
    using OperationStore for uint256[];

    /** Number of Aerum blocks when composers are updated */
    uint256 constant delegatesUpdateAerumBlocksPeriod = 1000;

    /** Min voting period. Hardcoded to one day */
    uint256 constant minVotingPeriod = 60 * 60 * 24;

    /** Max voting period. Hardcoded to one month */
    uint256 constant maxVotingPeriod = 60 * 60 * 24 * 30;

    /** Period when delegates can vote from proposal submission. */
    uint256 votingPeriod;

    /** Bond required for delegate to be registered. Should be more than 1M */
    uint256 public delegateBond;

    /** User used to upgrade governance or delegate contracts. Owner by default */
    address public upgradeAdmin;

    /** XRM token */
    ERC20 public token;

    /** Delegate factory */
    IDelegateFactory public delegateFactory;

    /** List of all delegates */
    address[] public delegates;
    /** Mapping of all known delegates. It's used to quickly check if it's known delegate */
    mapping(address => bool) public knownDelegates;
    /** List of bonds known by delegate */
    mapping(address => uint256) public bonds;

    /** Composers count. We should keep full history for consensus */
    uint256[] public composersCount;

    enum VotingCategory { BLACKLIST }

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
    event ComposersCountUpdated(uint256 count);
    event BlacklistUpdated(address indexed delegate, bool blocked);

    event DelegateCreated(address indexed delegate, address indexed owner);
    event DelegateUnregistered(address indexed delegate);
    event BondSent(address indexed delegate, uint256 amount);

    event ProposalSubmitted(bytes32 indexed id, address indexed author, address indexed delegate, VotingCategory category, bool proposal);
    event Vote(bytes32 indexed id, address indexed voter, bool inFavor);
    event VotingFinalized(bytes32 indexed id, bool voted, bool supported, uint256 proponentsWeight, uint256 opponentsWeight);

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

    /**
    * @notice Governance initializer
    * @param _owner Governance owner address
    * @param _token XRM token address
    * @param _delegatesLimit Max delegates / composers limit at one point of time
    * @param _delegateBond Delegate bond to be sent to create new delegate
    */
    function init(
        address _owner, address _token, address _delegateFactory,
        uint256 _delegatesLimit, uint256 _delegateBond
    ) initiator("v1") public {
        require(_owner != address(0));
        require(_token != address(0));
        require(_delegateFactory != address(0));
        require(_delegateBond >= 10 ** 24);

        Ownable.initialize(_owner);
        token = ERC20(_token);
        delegateFactory = IDelegateFactory(_delegateFactory);

        delegateBond = _delegateBond;
        upgradeAdmin = _owner;
        votingPeriod = minVotingPeriod;

        composersCount.storeInt(_delegatesLimit);
    }

    /**
    * @notice Set voting period
    * @param _votingPeriod New voting period
    */
    function setVotingPeriod(uint256 _votingPeriod) external onlyOwner {
        require(_votingPeriod >= minVotingPeriod && _votingPeriod <= maxVotingPeriod);
        votingPeriod = _votingPeriod;
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
        IDelegate(_delegate).updateBlacklist(_blocked);
        emit BlacklistUpdated(_delegate, _blocked);
    }

    /**
    * @notice Get delegates limit for timestamp
    * @param _timestamp Time for which composers count is returned
    */
    function getComposersCount(uint256 _timestamp) external view returns (uint256) {
        return composersCount.getInt(_timestamp);
    }

    /**
    * @notice Create new delegate contract, get bond and transfer ownership to a caller
    * @param _name Delegate name
    * @param _aerum Delegate Aerum address
    */
    function createDelegate(bytes32 _name, address _aerum) external returns (address) {
        token.safeTransferFrom(msg.sender, address(this), delegateBond);

        (address proxy, ) = delegateFactory.createDelegate(_name, _aerum, address(this), msg.sender, upgradeAdmin);

        delegates.push(proxy);
        knownDelegates[proxy] = true;
        bonds[proxy] = delegateBond;

        // Set delegate as active
        IDelegate(proxy).setActive(true);

        emit DelegateCreated(proxy, msg.sender);
        return proxy;
    }

    /**
    * @notice Unregister specified delegate. Can only be called by delegate itself
    */
    function unregisterDelegate() external onlyKnownDelegate(msg.sender) {
        address delegateAddr = msg.sender;
        IDelegate delegate = IDelegate(delegateAddr);
        require(delegate.isActive(block.timestamp) && !delegate.isBlacklisted(block.timestamp));

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
    function getComposers(uint256 _blockNum, uint256 _timestamp) external view returns (address[] memory) {
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
    function getDelegates() public view returns (address[] memory) {
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
    function getValidDelegates(uint256 _timestamp) public view returns (address[] memory, bytes32[] memory) {
        address[] memory array = new address[](delegates.length);
        uint16 length = 0;
        for (uint256 i = 0; i < delegates.length; i++) {
            if (isDelegateValid(delegates[i], _timestamp)) {
                array[length] = delegates[i];
                length++;
            }
        }
        address[] memory addresses = new address[](length);
        bytes32[] memory names = new bytes32[](length);
        for (uint256 j = 0; j < length; j++) {
            IDelegate delegate = IDelegate(array[j]);
            addresses[j] = delegate.getDelegateAerumAddress();
            names[j] = delegate.getNameAsBytes();
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
        IDelegate proxy = IDelegate(_delegate);
        // Delegate has not been activated
        if (!proxy.isActive(_timestamp)) {
            return false;
        }
        // Delegate has not been blacklisted
        if (proxy.isBlacklisted(_timestamp)) {
            return false;
        }
        return true;
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
        uint256 proponentsWeight;
        uint256 opponentsWeight;
        Voting storage voting = votings[_id];
        // have specified blacklist voting
        require(voting.id == _id);
        // voting period if finished
        require(voting.timestamp.add(votingPeriod) <= block.timestamp);

        uint256 requiredVotesNumber = getValidDelegateCount() * 3 / 10;
        if (voting.voters.length >= requiredVotesNumber) {
            voted = true;
            for (uint256 index = 0; index < voting.voters.length; index++) {
                uint256 stake = IDelegate(voting.voters[index]).getStake(block.timestamp);
                if (voting.votes[voting.voters[index]]) {
                    proponentsWeight = proponentsWeight.add(stake);
                } else {
                    opponentsWeight = opponentsWeight.add(stake);
                }
            }
            if(proponentsWeight > opponentsWeight) {
                supported = true;
                if (voting.category == VotingCategory.BLACKLIST) {
                    IDelegate(voting.delegate).updateBlacklist(voting.proposal);
                }
            }
        }

        delete votings[_id];

        emit VotingFinalized(_id, voted, supported, proponentsWeight, opponentsWeight);
    }

    /**
    * @notice Returns voting details by id
    * @param _id Voting id
    */
    function getVotingDetails(bytes32 _id) external view returns (bytes32, uint256, address, VotingCategory, bool, address[] memory, bool[] memory) {
        Voting storage voting = votings[_id];
        address[] storage voters = voting.voters;

        bool[] memory votes = new bool[] (voters.length);
        for (uint256 index = 0; index < voters.length; index++) {
            votes[index] = voting.votes[voters[index]];
        }

        return (voting.id, voting.timestamp, voting.delegate, voting.category, voting.proposal, voters, votes);
    }

}
