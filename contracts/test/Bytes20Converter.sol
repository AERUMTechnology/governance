pragma solidity 0.4.24;

import "../library/Conversions.sol";

/**
 * @title Contract used to test bytes20 to string converter
 */
contract Bytes20Converter {
    using Conversions for bytes20;

    /**
    * @dev Method used to test bytes20 to string converter
    */
    function bytes20ToString(bytes20 _input) external pure returns (string) {
        return _input.bytes20ToString();
    }

}