// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC7984 } from "@openzeppelin/fhevm/token/ERC7984/ERC7984.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract ConfidentialToken is ERC7984, SepoliaConfig {
    address public owner;
    uint256 public maxSupply;
    bool public mintingOpen;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        uint256 _maxSupply
    ) ERC7984(name, symbol) {
        owner = msg.sender;
        maxSupply = _maxSupply;
        mintingOpen = true;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(mintingOpen, "Minting is closed");
        _mintConfidential(to, amount);
    }

    function closeMinting() external onlyOwner {
        mintingOpen = false;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function getBalance(address account) external view returns (euint256) {
        return balanceOf(account);
    }
}
