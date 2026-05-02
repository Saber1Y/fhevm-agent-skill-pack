// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract ConfidentialVault is SepoliaConfig {
    mapping(address => euint32) private balances;

    event Deposited(address indexed user);
    event Withdrawn(address indexed user);

    function deposit(externalEuint32 amount, bytes calldata inputProof) external {
        euint32 value = FHE.fromExternal(amount, inputProof);
        FHE.allowThis(value);
        FHE.allow(value, msg.sender);

        balances[msg.sender] = FHE.add(balances[msg.sender], value);
        FHE.allowThis(balances[msg.sender]);
        FHE.allow(balances[msg.sender], msg.sender);

        emit Deposited(msg.sender);
    }

    function withdraw(externalEuint32 amount, bytes calldata inputProof) external {
        euint32 amt = FHE.fromExternal(amount, inputProof);
        FHE.allowThis(amt);

        ebool sufficient = FHE.gte(balances[msg.sender], amt);

        euint32 newBalance = FHE.select(
            sufficient,
            FHE.sub(balances[msg.sender], amt),
            balances[msg.sender]
        );
        FHE.allowThis(newBalance);
        FHE.allow(newBalance, msg.sender);
        balances[msg.sender] = newBalance;

        emit Withdrawn(msg.sender);
    }

    function getBalance() external view returns (euint32) {
        return balances[msg.sender];
    }

    function transfer(address to, externalEuint32 amount, bytes calldata inputProof) external {
        require(to != address(0), "Invalid recipient");

        euint32 amt = FHE.fromExternal(amount, inputProof);
        FHE.allowThis(amt);

        ebool sufficient = FHE.gte(balances[msg.sender], amt);

        euint32 senderNew = FHE.select(
            sufficient,
            FHE.sub(balances[msg.sender], amt),
            balances[msg.sender]
        );
        FHE.allowThis(senderNew);
        FHE.allow(senderNew, msg.sender);
        balances[msg.sender] = senderNew;

        euint32 receiverNew = FHE.select(
            sufficient,
            FHE.add(balances[to], amt),
            balances[to]
        );
        FHE.allowThis(receiverNew);
        FHE.allow(receiverNew, to);
        balances[to] = receiverNew;
    }
}
