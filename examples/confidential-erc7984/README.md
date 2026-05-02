# Confidential ERC-7984 Token

A fully confidential token built on OpenZeppelin's ERC-7984 standard. Balances and transfer amounts are encrypted on-chain.

## Features

- Encrypted balances (`euint256`)
- Confidential transfers
- Confidential approvals
- Owner-controlled minting
- Max supply enforcement

## Contract

`contracts/ConfidentialToken.sol`

## Quick Start

```bash
npx hardhat compile
npx hardhat test
```
