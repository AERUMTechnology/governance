pragma solidity 0.4.24;

library Conversions {

    /**
     * @notice Converts bytes20 to string
     */
    function bytes20ToString(bytes20 _input) internal pure returns (string) {
        bytes memory bytesString = new bytes(20);
        uint256 charCount = 0;
        for (uint256 index = 0; index < 20; index++) {
            byte char = byte(bytes20(uint256(_input) * 2 ** (8 * index)));
            if (char != 0) {
                bytesString[charCount] = char;
                charCount++;
            }
        }
        bytes memory bytesStringTrimmed = new bytes(charCount);
        for (index = 0; index < charCount; index++) {
            bytesStringTrimmed[index] = bytesString[index];
        }
        return string(bytesStringTrimmed);
    }

}