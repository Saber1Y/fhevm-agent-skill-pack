# Confidential Voting — Eval Checklist

## Contract (12 items)

- [ ] Contract extends SepoliaConfig (or equivalent network config)
- [ ] Imports FHE library with correct types (euint8, euint32)
- [ ] Constructor accepts candidate array and initializes vote counts
- [ ] Vote function takes externalEuint8 + bytes inputProof
- [ ] FHE.fromExternal(encryptedVote, inputProof) called correctly
- [ ] FHE.allowThis() called on encrypted vote
- [ ] FHE.allow() called for voter to decrypt their choice
- [ ] One-vote-per-address enforcement (mapping + require)
- [ ] Tally uses FHE.add for homomorphic accumulation
- [ ] endVoting function sets votingEnded flag
- [ ] getVoteCount returns euint32 encrypted handle
- [ ] No encrypted values in require() conditions

## Tests (8 items)

- [ ] Hardhat config includes @fhevm/hardhat-plugin
- [ ] Test creates fhevmjs instance with chainId + publicKey
- [ ] Test encrypts vote using instance.encrypt8()
- [ ] Test calls contract with encrypted.handles[0] + encrypted.inputProof
- [ ] Test verifies hasVoted mapping prevents double voting
- [ ] Test verifies invalid candidate index is rejected
- [ ] Test decrypts tally using userDecryptEuint
- [ ] Test verifies endVoting stops further votes

## Frontend (5 items)

- [ ] Creates FHE instance with createInstance()
- [ ] Encrypts vote with instance.encrypt8(choice)
- [ ] Sends encrypted.handles[0] + encrypted.inputProof to contract
- [ ] DecryptButton component uses EIP-712 userDecryptEuint
- [ ] Decrypts tally results after voting ends

## Linter (3 items)

- [ ] npm run fhevm:lint passes with 0 errors
- [ ] No warnings about missing FHE.allowThis
- [ ] No warnings about missing FHE.allow for users

## Build (3 items)

- [ ] npm run compile succeeds
- [ ] npm run test passes all tests
- [ ] Deploy script targets localhost and sepolia
