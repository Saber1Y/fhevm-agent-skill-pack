// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC7984 } from "@openzeppelin/fhevm/token/ERC7984/ERC7984.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { FHE, euint256, externalEuint256 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract ConfidentialWrapper is ERC7984, SepoliaConfig {
    ERC20 public immutable wrappedToken;
    address public owner;

    mapping(address => bool) public isWrappingOpen;

    event Wrapped(address indexed user, uint256 amount);
    event Unwrapped(address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        address _wrappedToken
    ) ERC7984(name, symbol) {
        wrappedToken = ERC20(_wrappedToken);
        owner = msg.sender;
        isWrappingOpen[msg.sender] = true;
    }

    function wrap(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        wrappedToken.transferFrom(msg.sender, address(this), amount);
        _mintConfidential(msg.sender, amount);
        emit Wrapped(msg.sender, amount);
    }

    function unwrap(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        _burnConfidential(msg.sender, amount);
        wrappedToken.transfer(msg.sender, amount);
        emit Unwrapped(msg.sender, amount);
    }

    function getWrappedBalance(address account) external view returns (euint256) {
        return balanceOf(account);
    }

    function getWrappedTokenBalance() external view returns (uint256) {
        return wrappedToken.balanceOf(address(this));
    }

    function setWrappingOpen(address user, bool open) external onlyOwner {
        isWrappingOpen[user] = open;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
