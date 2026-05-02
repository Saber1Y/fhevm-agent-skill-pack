# Sealed-Bid Auction

An auction where all bids are encrypted. Nobody can see other bids until the auction is finalized.

## Features

- Encrypted bid submission (`euint64`)
- One bid per address
- Encrypted highest bid tracking
- Post-finalization decryption

## Contract

`contracts/SealedBidAuction.sol`

## Quick Start

```bash
npx hardhat compile
npx hardhat test
```
