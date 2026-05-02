# Frontend Decrypt Demo — Eval Checklist

## Contract (8 items)

- [ ] Vault contract extends SepoliaConfig
- [ ] deposit takes externalEuint32 + bytes inputProof
- [ ] withdraw uses FHE.select for conditional logic
- [ ] FHE.allowThis on all encrypted state
- [ ] FHE.allow for user decryption on deposit
- [ ] getBalance returns euint32 handle
- [ ] Events emit addresses, not encrypted values
- [ ] No encrypted values in require conditions

## Frontend (12 items)

- [ ] FhevmProvider creates FHE instance with chainId + publicKey
- [ ] FhevmProvider manages wallet connection state
- [ ] DecryptButton handles euint32/euint64/euint256/ebool types
- [ ] DecryptButton triggers EIP-712 wallet signature
- [ ] DecryptButton shows loading state during decryption
- [ ] DecryptButton handles errors gracefully
- [ ] VaultApp has deposit form with amount input
- [ ] VaultApp encrypts deposit amount before sending
- [ ] VaultApp has withdraw form
- [ ] VaultApp has transfer form with recipient + amount
- [ ] VaultApp fetches encrypted balance on load
- [ ] VaultApp displays decrypted balance after user action

## Tests (6 items)

- [ ] Deposit test with encrypted input
- [ ] Withdraw test with balance verification
- [ ] Transfer test between two users
- [ ] User isolation (different balances)
- [ ] Event emission tests
- [ ] Decryption verification in tests

## Linter (3 items)

- [ ] fhevm:lint passes with 0 errors
- [ ] No encrypted-in-event warnings (or accepted)
- [ ] All ACL patterns correct

## Build (3 items)

- [ ] npm run compile succeeds
- [ ] npm run test passes
- [ ] Frontend components are reusable
