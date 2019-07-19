pragma solidity 0.4.24;

library OperationStore {

    /**
     * @notice Stores historical integer data
     * @param _history History of stored int data in format time1, value1, time2, value2, time3...
     * @param _value Value to be stored
     */
    function storeInt(uint256[] storage _history, uint256 _value) internal {
        _history.push(block.timestamp);
        _history.push(_value);
    }

    /**
     * @notice Returns integer value for specified time
     * @param _history History of stored int data in format time1, value1, time2, value2, time3...
     * @param _timestamp Time for which we get value
     */
    function getInt(uint256[] memory _history, uint256 _timestamp) internal pure returns (uint256) {
        uint256 index = findIndex(_history, _timestamp, 2);
        if (index > 0) {
            return _history[index - 1];
        }
        return 0;
    }

    /**
     * @notice Stores historical boolean data
     * @param _history History of stored boolean data in format: new record each times value changed (time1, time2...)
     * @param _value Value to be stored
     */
    function storeBool(uint256[] storage _history, bool _value) internal {
        bool current = (_history.length % 2 == 1);
        if (current != _value) {
            _history.push(block.timestamp);
        }
    }

    /**
     * @notice Returns boolean value for specified time
     * @param _history History of stored boolean data in format: new record each times value changed (time1, time2...)
     * @param _timestamp Time for which we get value
     */
    function getBool(uint256[] memory _history, uint256 _timestamp) internal pure returns (bool) {
        return findIndex(_history, _timestamp, 1) % 2 == 1;
    }

    /**
     * @notice Stores historical timestamp data
     * @param _history History of stored timestamp data in format: time1, time2, time3...
     * @param _value Value to be stored
     */
    function storeTimestamp(uint256[] storage _history, uint256 _value) internal {
        _history.push(_value);
    }

    /**
     * @notice Returns last timestamp value for specified time
     * @param _history History of stored timestamp data in format: time1, time2, time3...
     * @param _timestamp Time for which we get value
     */
    function getTimestamp(uint256[] memory _history, uint256 _timestamp) internal pure returns (uint256) {
        uint256 index = findIndex(_history, _timestamp, 1);
        if (index > 0) {
            return _history[index - 1];
        }
        return 0;
    }

    /**
     * @notice Searches for index of timestamp with specified step
     * @dev History elements is sorted so binary search is used.
     * @param _history History of stored timestamp data in format: time1, time2, time3...
     * @param _timestamp Time for which we get value
     * @param _step Step used for binary search. For bool & timestamp steps is 1, for uint step is 2
     */
    function findIndex(uint256[] memory _history, uint256 _timestamp, uint256 _step) internal pure returns (uint256) {
        if (_history.length == 0) {
            return 0;
        }
        uint256 low = 0;
        uint256 high = _history.length - _step;

        while (low <= high) {
            uint256 mid = ((low + high) >> _step) << (_step - 1);
            uint256 midVal = _history[mid];
            if (midVal < _timestamp) {
                low = mid + _step;
            } else if (midVal > _timestamp) {
                if (mid == 0) {
                    return 0;
                    // min key
                }
                high = mid - _step;
            } else {
                // take the last one if there are many same items
                uint256 result = mid + _step;
                while (result < _history.length && _history[result] == _timestamp) {
                    result = result + _step;
                }
                // key found
                return result;
            }
        }
        // key not found
        return low;
    }

}