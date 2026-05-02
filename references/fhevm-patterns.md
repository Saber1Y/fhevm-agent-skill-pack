# FHEVM Core Patterns

Canonical patterns for building with Zama FHEVM. These are the proven patterns that compile, test, and deploy correctly.

## Contract Setup

Every FHEVM contract must import the FHE library and use the correct pragma:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, euint64, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract MyContract is SepoliaConfig {
    // Contract body
}
```

The network config (e.g., `SepoliaConfig`, `LocalFHEVMConfig`) provides the FHE coprocessor address and gateway configuration.

## Storing Encrypted State

```solidity
contract MyContract is SepoliaConfig {
    euint32 private storedValue;

    function setValue(externalEuint32 input, bytes calldata inputProof) external {
        euint32 value = FHE.fromExternal(input, inputProof);
        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
        storedValue = value;
    }
}
```

**Pattern**: `fromExternal` → `allowThis` → `allow(user)` → store

## Reading Encrypted State

```solidity
function getValue() external view returns (euint32) {
    return storedValue;
}
```

The caller decrypts on the frontend via fhevmjs.

## Conditional Logic with Encrypted Values

You cannot use `if/else` with encrypted booleans. Use `FHE.select()`:

```solidity
// Encrypted balance check
ebool hasEnough = FHE.gte(balance, amount);

// Select between two outcomes
euint32 newBalance = FHE.select(
    hasEnough,
    FHE.sub(balance, amount),  // if true: subtract
    balance                     // if false: keep unchanged
);
```

## Encrypted Comparisons

```solidity
euint32 a = ...;
euint32 b = ...;

ebool equal = FHE.eq(a, b);
ebool greater = FHE.gt(a, b);
ebool less = FHE.lt(a, b);
ebool gte = FHE.gte(a, b);
ebool lte = FHE.lte(a, b);
```

All return `ebool` — never plain `bool`.

## Encrypted Arithmetic

```solidity
euint32 a = ...;
euint32 b = ...;

euint32 sum = FHE.add(a, b);
euint32 diff = FHE.sub(a, b);
euint32 product = FHE.mul(a, b);
euint32 quotient = FHE.div(a, b);
euint32 remainder = FHE.rem(a, b);
```

## Bitwise Operations

```solidity
euint32 andVal = FHE.and(a, b);
euint32 orVal = FHE.or(a, b);
euint32 xorVal = FHE.xor(a, b);
euint32 notVal = FHE.not(a);
euint32 shlVal = FHE.shl(a, 4);
euint32 shrVal = FHE.shr(a, 4);
```

## Min/Max with Encrypted Values

```solidity
euint32 minimum = FHE.min(a, b);
euint32 maximum = FHE.max(a, b);
```

## Mapping with Encrypted Values

```solidity
mapping(address => euint32) private balances;

function updateBalance(
    address user,
    externalEuint32 amount,
    bytes calldata proof
) external {
    euint32 value = FHE.fromExternal(amount, proof);
    FHE.allowThis(value);
    FHE.allow(value, user);
    balances[user] = value;
}
```

## Multiple Encrypted Inputs

```solidity
function transfer(
    address to,
    externalEuint32 amount,
    bytes calldata amountProof
) external {
    euint32 amt = FHE.fromExternal(amount, amountProof);
    FHE.allowThis(amt);

    ebool sufficient = FHE.gte(balances[msg.sender], amt);

    euint32 senderNew = FHE.select(
        sufficient,
        FHE.sub(balances[msg.sender], amt),
        balances[msg.sender]
    );

    euint32 receiverNew = FHE.select(
        sufficient,
        FHE.add(balances[to], amt),
        balances[to]
    );

    FHE.allowThis(senderNew);
    FHE.allow(senderNew, msg.sender);
    balances[msg.sender] = senderNew;

    FHE.allowThis(receiverNew);
    FHE.allow(receiverNew, to);
    balances[to] = receiverNew;
}
```

## Accumulator Pattern

```solidity
euint32 private totalSupply;

function mint(externalEuint32 amount, bytes calldata proof) external {
    euint32 amt = FHE.fromExternal(amount, proof);
    FHE.allowThis(amt);
    totalSupply = FHE.add(totalSupply, amt);
    FHE.allowThis(totalSupply);
}
```

## Zero-Value Encrypted Constants

```solidity
// Create encrypted zero
euint32 zero = FHE.asEuint32(0);
ebool falseVal = FHE.asEbool(false);
```

## Type Casting Between Encrypted Types

```solidity
euint8 small = FHE.asEuint8(value32);
euint32 big = FHE.asEuint32(value8);
euint64 bigger = FHE.asEuint64(value32);
```

Use `FHE.asEuintXX()` for widening/narrowing casts.
