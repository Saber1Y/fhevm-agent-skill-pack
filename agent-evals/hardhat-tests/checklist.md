# Hardhat Tests — Eval Checklist

## Setup (5 items)

- [ ] hardhat.config.ts includes @fhevm/hardhat-plugin
- [ ] Solidity version set to ^0.8.24
- [ ] Test file uses chai + ethers + fhevmjs
- [ ] beforeEach deploys fresh contract instance
- [ ] fhevmjs instance created with chainId + publicKey

## Test Cases (15 items)

- [ ] Deployment test (contract address valid)
- [ ] Candidate name retrieval test
- [ ] Encrypted vote submission test
- [ ] hasVoted mapping updated after vote
- [ ] Double voting prevention (reverts)
- [ ] Invalid candidate index rejection (reverts)
- [ ] Multiple voters can vote for same candidate
- [ ] Vote accumulation (2 votes for same candidate = 2)
- [ ] Decrypt tally using userDecryptEuint
- [ ] Decrypted tally matches expected count
- [ ] End voting prevents further votes
- [ ] getVoteCount returns euint32 (bigint in JS)
- [ ] Zero vote state test (initial count = 0)
- [ ] Multiple candidates all receive votes
- [ ] Event emission test (if applicable)

## Test Patterns (5 items)

- [ ] Uses instance.encrypt8() for vote encryption
- [ ] Uses encrypted.handles[0] + encrypted.inputProof
- [ ] Uses connect(signer) for multi-user tests
- [ ] Uses expect().to.be.revertedWith() for error cases
- [ ] Uses userDecryptEuint for balance/tally verification

## Build (3 items)

- [ ] npm run compile succeeds
- [ ] npm run test passes all tests
- [ ] No TypeScript compilation errors
