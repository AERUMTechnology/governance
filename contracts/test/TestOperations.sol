pragma solidity 0.5.10;

import "../library/OperationStore.sol";

/**
 * @title Contract used to test operations store
 */
contract TestOperations {
    using OperationStore for uint256[];

    uint256[] public intHistory;
    uint256[] public boolHistory;
    uint256[] public timeHistory;

    /**
     * @notice Stores historical integer data
     * @param _value Value to be stored
     */
    function storeInt(uint256 _value) external {
        intHistory.storeInt(_value);
    }

    /**
     * @notice Returns integer value for specified time
     * @param _timestamp Time for which we get value
     */
    function getInt(uint256 _timestamp) external view returns (uint256) {
        return intHistory.getInt(_timestamp);
    }

    /**
     * @notice Returns integer history
     */
    function getIntHistory() external view returns (uint256[] memory) {
        return intHistory;
    }

    /**
     * @notice Stores historical boolean data
     * @param _value Value to be stored
     */
    function storeBool(bool _value) external {
        boolHistory.storeBool(_value);
    }

    /**
     * @notice Returns boolean value for specified time
     * @param _timestamp Time for which we get value
     */
    function getBool(uint256 _timestamp) external view returns (bool) {
        return boolHistory.getBool(_timestamp);
    }

    /**
     * @notice Returns bool history
     */
    function getBoolHistory() external view returns (uint256[] memory) {
        return boolHistory;
    }

    /**
     * @notice Stores historical timestamp data
     * @param _value Value to be stored
     */
    function storeTimestamp(uint256 _value) external {
        timeHistory.storeTimestamp(_value);
    }

    /**
     * @notice Returns last timestamp value for specified time
     * @param _timestamp Time for which we get value
     */
    function getTimestamp(uint256 _timestamp) external view returns (uint256) {
        return timeHistory.getTimestamp(_timestamp);
    }

    /**
     * @notice Returns time history
     */
    function getTimestampHistory() external view returns (uint256[] memory) {
        return timeHistory;
    }

}
