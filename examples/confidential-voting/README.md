# Confidential Voting

A fully encrypted voting system using FHEVM. Votes are encrypted on-chain, tallied homomorphically, and results can be decrypted by authorized users.

## Features

- Encrypted vote submission (`euint8`)
- Per-voter ballot (one vote per address)
- Homomorphic tally accumulation
- User decryption of final results
- Voting end control

## Quick Start

```bash
npx hardhat compile
npx hardhat test
```

## Contract

`contracts/ConfidentialVoting.sol`

## How It Works

1. Deploy with candidate names
2. Voters submit encrypted vote choice (`euint8` + `inputProof`)
3. Contract validates choice is within range
4. Tally is accumulated homomorphically
5. After voting ends, authorized users decrypt results
