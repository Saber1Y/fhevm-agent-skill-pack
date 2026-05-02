# FHEVM Agent Engineer: Production Skill Pack for Confidential Smart Contracts

Turn any AI coding agent (Cursor, Claude Code, Windsurf) into a reliable FHEVM developer. This skill pack provides the patterns, references, examples, and validator that agents need to build, test, and deploy confidential smart contracts correctly.

## Quick Install

```bash
# Option 1: npm package
npx @fhevm/agent-skill init

# Option 2: clone repo
git clone https://github.com/Saber1Y/fhevm-agent-skill-pack.git
cp fhevm-agent-skill-pack/SKILL.md my-project/
cp -r fhevm-agent-skill-pack/references my-project/
cp fhevm-agent-skill-pack/scripts/fhevm-lint.js my-project/scripts/
```

## What's Included

### SKILL.md
The core agent brain — tells AI agents how to set up FHEVM, write contracts, test, deploy, and integrate frontends. Includes decision trees and anti-pattern warnings.

### references/ (9 files)
- `fhevm-patterns.md` — Core FHEVM operation patterns
- `encrypted-types.md` — Full type matrix (euint8 through euint256)
- `acl-and-permissions.md` — ACL system: FHE.allow, FHE.allowThis, FHE.allowTransient
- `input-proofs.md` — ZK proof validation for encrypted inputs
- `decryption-flows.md` — User decryption with EIP-712 signing
- `erc7984-confidential-token.md` — ERC-7984 confidential token standard
- `frontend-fhevmjs.md` — Frontend integration with fhevmjs + React
- `testing-hardhat.md` — Hardhat testing patterns with encrypted inputs
- `anti-patterns.md` — 8 common mistakes with fixes

### examples/ (5 production examples)
- `confidential-voting/` — Encrypted voting with tally decryption
- `sealed-bid-auction/` — Sealed-bid auction with encrypted bids
- `confidential-erc7984/` — Full ERC-7984 confidential token
- `erc20-wrapper/` — ERC-20 ↔ ERC-7984 wrapping flow
- `frontend-decrypt-demo/` — React frontend with decrypt button

### scripts/fhevm-lint.js
Validator that scans Solidity files for 8 common FHEVM mistakes:
1. Missing ZamaEthereumConfig import
2. Missing FHE.allowThis()
3. Missing FHE.allow() for users
4. Encrypted values in require()
5. Returning encrypted values without ACL
6. Missing inputProof parameter
7. Decrypting inside Solidity
8. Encrypted handles in events

### agent-evals/ (5 test cases)
Prompt-based evaluation cases with expected output and checklists:
- Confidential voting
- Confidential payroll
- Confidential ERC-7984 token
- Frontend decrypt demo
- Hardhat test writing

## Usage

1. Install the skill into your project
2. Open your project in Cursor/Claude Code (agent reads SKILL.md automatically)
3. Prompt: "Build a confidential voting dApp with encrypted votes, user decryption, tests, and frontend"
4. Agent generates the code
5. Run `npm run fhevm:lint` to catch mistakes
6. Run `npm run test` to verify
7. Deploy

## Development Workflow

```
prompt → agent reads SKILL.md → generates code → fhevm:lint catches errors → agent fixes → npm run test passes → deploy
```

## License

MIT
