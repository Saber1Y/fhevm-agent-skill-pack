# Frontend Decrypt Demo

A React frontend that demonstrates the full FHEVM decryption flow: connect wallet, deposit encrypted values, decrypt balances with EIP-712 signatures.

## Features

- Wallet connection with FHEVM instance creation
- Encrypted deposit/withdraw/transfer
- Decrypt balance button with EIP-712 signing
- Real-time status feedback

## Components

- `FhevmProvider.tsx` — React context for wallet + FHE instance
- `DecryptButton.tsx` — Reusable decrypt button with signature flow
- `VaultApp.tsx` — Full vault UI

## Quick Start

```bash
npm install
npm run dev
```

## Contract

`contracts/ConfidentialVault.sol`
