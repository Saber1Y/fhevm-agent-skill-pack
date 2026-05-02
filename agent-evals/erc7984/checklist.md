# Confidential ERC-7984 Token — Eval Checklist

## Contract (12 items)

- [ ] Contract extends ERC7984 from OpenZeppelin
- [ ] Contract extends SepoliaConfig
- [ ] Constructor sets name, symbol, maxSupply
- [ ] Owner-controlled mint function
- [ ] _mintConfidential used for encrypted minting
- [ ] Confidential transfer using encrypted amounts
- [ ] Confidential approve with encrypted allowance
- [ ] transferFrom with encrypted allowance check
- [ ] closeMinting admin function
- [ ] getBalance returns euint256 handle
- [ ] Max supply enforcement
- [ ] No plaintext balances exposed

## Tests (8 items)

- [ ] fhevmjs encrypt256 for large token amounts
- [ ] Mint test with owner-only access control
- [ ] Transfer test with balance verification via decryption
- [ ] Approve test with encrypted allowance
- [ ] transferFrom test with allowance consumption
- [ ] Close minting test
- [ ] Double-spend prevention
- [ ] Non-owner mint rejection

## Frontend (5 items)

- [ ] Connect wallet to encrypted token
- [ ] Decrypt balance button
- [ ] Transfer UI with encrypted amount input
- [ ] Approve UI for spending allowance
- [ ] Token metadata display

## Linter (3 items)

- [ ] fhevm:lint passes with 0 errors
- [ ] ERC7984 base contract doesn't trigger false positives
- [ ] No missing ACL warnings

## Build (3 items)

- [ ] npm run compile succeeds
- [ ] npm run test passes
- [ ] Deploy script includes token parameters
