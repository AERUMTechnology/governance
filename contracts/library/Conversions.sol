pragma solidity 0.5.10;

library Conversions {
    /**
     * @notice Converts bytes32 to string
     */
    function bytes32ToString(bytes32 _input) internal pure returns (string memory) {
        bytes memory bytesString = new bytes(32);
        uint256 charCount = 0;
        uint256 index = 0;
        for (index = 0; index < 32; index++) {
            byte char = byte(bytes32(uint256(_input) * 2 ** (8 * index)));
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
