# ERC-20 Wrapper

A bridge between standard ERC-20 tokens and confidential ERC-7984 tokens. Users wrap ERC-20 to get encrypted balances, and unwrap to get their ERC-20 back.

## Features

- `wrap(amount)` — deposit ERC-20, receive encrypted ERC-7984
- `unwrap(amount)` — burn ERC-7984, receive ERC-20 back
- Confidential transfers between wrapped users
- Event emission for wrap/unwrap tracking

## Contract

`contracts/ConfidentialWrapper.sol`

## Quick Start

```bash
npx hardhat compile
npx hardhat test
```

## Flow

```
User ERC-20 balance  →  wrap()  →  Confidential ERC-7984 balance
Confidential balance  →  unwrap()  →  User ERC-20 balance
```
