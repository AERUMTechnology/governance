pragma solidity 0.5.10;

import "../library/Conversions.sol";

/**
 * @title Contract used to test bytes20 to string converter
 */
contract Bytes32Converter {
    using Conversions for bytes32;

    /**
    * @dev Method used to test bytes20 to string converter
    */
    function bytes32ToString(bytes32 _input) external pure returns (string memory) {
        return _input.bytes32ToString();
    }

}
