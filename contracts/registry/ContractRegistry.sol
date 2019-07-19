pragma solidity 0.5.10;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "../vesting/MultiVestingWallet.sol";

/**
 * @title Contract registry
 */
contract ContractRegistry is Ownable {

    struct ContractRecord {
        address addr;
        bytes32 name;
        bool enabled;
    }

    address private token;

    /**
     * @dev contracts Mapping of contracts
     */
    mapping(bytes32 => ContractRecord) private contracts;
    /**
     * @dev contracts Mapping of contract names
     */
    bytes32[] private contractsName;

    event ContractAdded(bytes32 indexed _name);
    event ContractRemoved(bytes32 indexed _name);

    constructor(address _token) public {
        require(_token != address(0), "Token is required");
        token = _token;
    }

    /**
     * @dev Returns contract by name
     * @param _name Contract's name
     */
    function getContractByName(bytes32 _name) external view returns (address, bytes32, bool) {
        ContractRecord memory record = contracts[_name];
        if(record.addr == address(0) || !record.enabled) {
            return(address(0), bytes32(0), false);
        }
        return (record.addr, record.name, record.enabled);
    }

    /**
     * @dev Returns contract's names
     */
    function getContractNames() external view returns (bytes32[] memory) {
        uint count = 0;
        for(uint i = 0; i < contractsName.length; i++) {
            if(contracts[contractsName[i]].enabled) {
                count++;
            }
        }
        bytes32[] memory result = new bytes32[](count);
        uint j = 0;
        for(uint i = 0; i < contractsName.length; i++) {
            if(contracts[contractsName[i]].enabled) {
                result[j] = contractsName[i];
                j++;
            }
        }
        return result;
    }

    /**
     * @notice Creates a vesting contract that vests its balance of any ERC20 token to the
     * of the balance will have vested.
     * @param _name contract's name
     * @param _cliff duration in seconds of the cliff in which tokens will begin to vest
     * @param _start the time (as Unix time) at which point vesting starts
     * @param _duration duration in seconds of the period in which the tokens will vest
     * @param _revocable whether the vesting is revocable or not
     */
    function addContract(
        bytes32 _name,
        uint256 _start,
        uint256 _cliff,
        uint256 _duration,
        bool _revocable) external onlyOwner {
        require(contracts[_name].addr == address(0), "Contract's name should be unique");
        require(_cliff <= _duration, "Cliff shall be bigger than duration");

        MultiVestingWallet wallet = new MultiVestingWallet(token, _start, _cliff, _duration, _revocable);
        wallet.transferOwnership(msg.sender);
        address walletAddr = address(wallet);
        
        ContractRecord memory record = ContractRecord({
            addr: walletAddr,
            name: _name,
            enabled: true
        });
        contracts[_name] = record;
        contractsName.push(_name);

        emit ContractAdded(_name);
    }

    /**
     * @dev Enables/disables contract by address
     * @param _name Name of the contract
     */
    function setEnabled(bytes32 _name, bool enabled) external onlyOwner {
        ContractRecord memory record = contracts[_name];
        require(record.addr != address(0), "Contract with specified address does not exist");

        contracts[_name].enabled = enabled;
    }

     /**
     * @dev Set's new name
     * @param _oldName Old name of the contract
     * @param _newName New name of the contract
     */
    function setNewName(bytes32 _oldName, bytes32 _newName) external onlyOwner {
        require(contracts[_newName].addr == address(0), "Contract's name should be unique");

        ContractRecord memory record = contracts[_oldName];
        require(record.addr != address(0), "Contract's old name should be defined");

        record.name = _newName;
        contracts[_newName] = record;
        contractsName.push(_newName);

        delete contracts[_oldName];
        contractsName = removeByValue(contractsName, _oldName);
    }

    function removeByValue(bytes32[] memory _array, bytes32 _name) private pure returns(bytes32[] memory) {
        uint i = 0;
        uint j = 0;
        bytes32[] memory outArray = new bytes32[](_array.length - 1);
        while (i < _array.length) {
            if(_array[i] != _name) {
                outArray[j] = _array[i];
                j++;
            }
            i++;
        }
        return outArray;
    }
}
