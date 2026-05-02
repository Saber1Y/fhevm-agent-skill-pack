---
name: fhevm-agent-engineer
description: Production skill for building FHEVM (Zama) confidential smart contracts. Turns AI agents into reliable FHEVM developers with built-in error prevention, validated patterns, and full development workflow.
author: Saber1Y
version: 1.0.0
license: MIT
---

# FHEVM Agent Engineer

You are an expert FHEVM (Fully Homomorphic Encryption Virtual Machine) developer. When building with Zama's FHEVM, you follow the patterns, types, and workflows documented in this skill pack. You produce code that compiles, passes tests, and deploys correctly — every time.

## Core Workflow

When a user asks you to build an FHEVM application, follow this sequence:

1. **Setup** → Initialize Hardhat FHEVM project using the official template
2. **Contract** → Write Solidity contracts using correct encrypted types and FHE operations
3. **ACL** → Add `FHE.allowThis()` and `FHE.allow()` calls for every encrypted value
4. **Input Proofs** → Use `FHE.fromExternal(externalValue, inputProof)` for all encrypted inputs
5. **Tests** → Write Hardhat tests using the FHEVM plugin with encrypted inputs and user decryption
6. **Frontend** → Integrate fhevmjs for user decryption with EIP-712 signing
7. **Validate** → Run `npm run fhevm:lint` to catch common mistakes before shipping

## Quick Start

```bash
npx create-fhevm-app my-project
cd my-project
npm install
npm run compile
npm run test
```

## Encrypted Types

FHEVM introduces encrypted Solidity types. These are **handles** to ciphertexts stored in the coprocessor — you cannot read plaintext values inside Solidity.

| Type | Description | External Input Type |
|---|---|---|
| `euint4` | 4-bit encrypted unsigned int | `externalEuint4` |
| `euint8` | 8-bit encrypted unsigned int | `externalEuint8` |
| `euint16` | 16-bit encrypted unsigned int | `externalEuint16` |
| `euint32` | 32-bit encrypted unsigned int | `externalEuint32` |
| `euint64` | 64-bit encrypted unsigned int | `externalEuint64` |
| `euint128` | 128-bit encrypted unsigned int | `externalEuint128` |
| `euint256` | 256-bit encrypted unsigned int | `externalEuint256` |
| `ebool` | Encrypted boolean | `externalEbool` |
| `eaddress` | Encrypted Ethereum address | `externalEaddress` |

### Usage Rules

- **Never** compare encrypted values with `==`, `>`, `<` — use `FHE.eq()`, `FHE.gt()`, `FHE.lt()`
- **Never** use encrypted values in standard `require()` conditions — use `FHE.select()`
- **Never** attempt to decrypt inside Solidity — decryption happens on frontend via fhevmjs
- **Never** store encrypted values without calling `FHE.allowThis()` first
- **Always** use `FHE.fromExternal(externalValue, inputProof)` to validate encrypted inputs
- Encrypted types are **opaque handles** — arithmetic operations return new handles

## FHE Operations

### Arithmetic

```solidity
euint32 sum = FHE.add(a, b);
euint32 diff = FHE.sub(a, b);
euint32 product = FHE.mul(a, b);
euint32 quotient = FHE.div(a, b);
euint32 remainder = FHE.rem(a, b);
```

### Comparison (returns `ebool`)

```solidity
ebool isEqual = FHE.eq(a, b);
ebool isGreater = FHE.gt(a, b);
ebool isLess = FHE.lt(a, b);
ebool isGreaterEq = FHE.gte(a, b);
ebool isLessEq = FHE.lte(a, b);
```

### Bitwise

```solidity
euint32 andResult = FHE.and(a, b);
euint32 orResult = FHE.or(a, b);
euint32 xorResult = FHE.xor(a, b);
euint32 notResult = FHE.not(a);
```

### Conditional Selection

Use `FHE.select()` instead of `if/else` with encrypted conditions:

```solidity
// If condition is true, return valueIfTrue; otherwise return valueIfFalse
euint32 result = FHE.select(condition, valueIfTrue, valueIfFalse);
```

### Min/Max

```solidity
euint32 minimum = FHE.min(a, b);
euint32 maximum = FHE.max(a, b);
```

## Access Control (ACL)

Every encrypted value has an ACL (Access Control List). By default, only the creator can decrypt it. You must explicitly grant access.

### Grant Access to Contract

```solidity
euint32 value = FHE.fromExternal(input, inputProof);
FHE.allowThis(value);  // Contract can now use this value
```

### Grant Access to a Specific User

```solidity
FHE.allow(value, msg.sender);  // msg.sender can decrypt this value
```

### Grant Transient Access

```solidity
FHE.allowTransient(value, msg.sender);  // Access only for current transaction
```

### ACL Pattern Checklist

Every time you store or use an encrypted value, ask:

1. Does the contract need to read/use it? → `FHE.allowThis(value)`
2. Does the user need to decrypt it later? → `FHE.allow(value, user)`
3. Is it a one-time use? → `FHE.allowTransient(value, user)`

**Missing ACL = most common FHEVM bug.** The linter will catch it.

## Input Proofs

Encrypted inputs from users must be accompanied by a zero-knowledge proof that the ciphertext is well-formed.

### Contract Side

```solidity
contract MyContract {
    function setEncryptedValue(
        externalEuint32 encryptedInput,
        bytes calldata inputProof
    ) external {
        euint32 value = FHE.fromExternal(encryptedInput, inputProof);
        FHE.allowThis(value);
        storedValue = value;
    }
}
```

### Frontend Side

The frontend generates the proof using fhevmjs:

```typescript
import { createInstance } from "fhevmjs";

const instance = await createInstance({ chainId, publicKey, networkFheParams });
const encrypted = instance.encrypt32(42);
// encrypted handles + encrypted.input proof are sent to contract
```

**Never skip `inputProof` — it's required for security.**

## User Decryption Flow

Users decrypt encrypted values through an EIP-712 signed request flow.

### Contract Side — Public Decrypt Getter

```solidity
function getEncryptedValue() external view returns (euint32) {
    return storedValue;
}
```

### Frontend Side

```typescript
import { createInstance } from "fhevmjs";

// 1. Connect wallet and get FHE instance
const instance = await createInstance({ chainId, publicKey, networkFheParams });

// 2. Fetch the encrypted value from contract
const encryptedValue = await contract.getEncryptedValue();

// 3. Request user signature for decryption
const decrypted = await instance.userDecryptEuint(
  Handle.euint32(encryptedValue),
  contractAddress,
  userAddress
);
```

## Common Anti-Patterns (NEVER DO THESE)

### 1. Using encrypted values in require()

```solidity
// WRONG — will not compile
require(balance >= amount, "Insufficient balance");

// CORRECT — use FHE comparison + select
ebool hasBalance = FHE.gte(balance, amount);
FHE.select(hasBalance, /* proceed */, /* revert path */);
```

### 2. Missing FHE.allowThis()

```solidity
// WRONG — contract can't use the value
euint32 value = FHE.fromExternal(input, proof);
storedValue = value;

// CORRECT — always allow contract access
euint32 value = FHE.fromExternal(input, proof);
FHE.allowThis(value);
storedValue = value;
```

### 3. Missing FHE.allow() for user

```solidity
// WRONG — user can never decrypt
FHE.allowThis(balance);

// CORRECT — also allow user
FHE.allowThis(balance);
FHE.allow(balance, msg.sender);
```

### 4. Returning encrypted values without ACL

```solidity
// WRONG — returned value is not accessible to anyone
function getBalance() external view returns (euint32) {
    return balances[msg.sender];
}

// CORRECT — set ACL when storing
function setBalance(externalEuint32 input, bytes calldata proof) external {
    euint32 value = FHE.fromExternal(input, proof);
    FHE.allowThis(value);
    FHE.allow(value, msg.sender);
    balances[msg.sender] = value;
}
```

### 5. Attempting to decrypt in Solidity

```solidity
// WRONG — Solidity cannot decrypt FHEVM ciphertexts
uint32 plain = uint32(encryptedValue);

// CORRECT — decryption happens on frontend only
```

### 6. Exposing encrypted handles in events

```solidity
// WRONG — encrypted handles in events are meaningless to listeners
event BalanceUpdated(euint32 balance);

// CORRECT — emit event with address/identifier, not the encrypted value
event BalanceUpdated(address user);
```

### 7. Missing inputProof for external encrypted inputs

```solidity
// WRONG — no proof validation
function deposit(externalEuint32 amount) external {
    euint32 value = FHE.fromExternal(amount); // Missing proof!
}

// CORRECT — always require proof
function deposit(externalEuint32 amount, bytes calldata proof) external {
    euint32 value = FHE.fromExternal(amount, proof);
}
```

## ERC-7984 Confidential Token Standard

ERC-7984 is Zama's confidential token standard. It extends ERC-20 concepts with encrypted balances, amounts, and confidential transfers.

### Key Features

- **Encrypted balances** — `euint256` for each holder
- **Encrypted transfer amounts** — `externalEuint256` + `inputProof`
- **Confidential approvals** — encrypted allowances
- **Wrapping/Unwrapping** — ERC-20 ↔ ERC-7984 conversion
- **Operator callbacks** — custom logic on transfer
- **Privacy by default** — no plaintext balances visible on-chain

### Basic ERC-7984 Pattern

```solidity
import "@openzeppelin/fhevm/token/ERC7984/ERC7984.sol";

contract MyConfidentialToken is ERC7984 {
    constructor() ERC7984("My Token", "MTK") {}
}
```

### Wrapping ERC-20 to ERC-7984

```solidity
// User deposits ERC-20 → receives ERC-7984
function wrap(uint256 amount) external {
    erc20Token.transferFrom(msg.sender, address(this), amount);
    _mintConfidential(msg.sender, amount); // encrypted balance
}

// User burns ERC-7984 → receives ERC-20 back
function unwrap(uint256 amount) external {
    _burnConfidential(msg.sender, amount);
    erc20Token.transfer(msg.sender, amount);
}
```

## Hardhat Testing

### Setup

```typescript
import { expect } from "chai";
import hre from "hardhat";
import { FhevmCoinSigner, FhevmConfig } from "@fhevm/hardhat";

describe("MyContract", function () {
  it("should work with encrypted values", async function () {
    const Contract = await hre.ethers.getContractFactory("MyContract");
    const contract = await Contract.deploy();

    // Create encrypted input
    const signers = await hre.ethers.getSigners();
    const user = signers[0];
    const input = await user.encrypt32(100);

    // Call contract with encrypted input + proof
    await contract.setValue(input.handles[0], input.inputProof);

    // User-side decryption check
    const encrypted = await contract.getValue();
    const decrypted = await user.userDecryptEuint(encrypted);
    expect(decrypted).to.equal(100);
  });
});
```

## Project Structure

When scaffolding a new FHEVM project:

```
my-fhevm-project/
├── contracts/
│   └── MyContract.sol
├── test/
│   └── MyContract.test.ts
├── scripts/
│   ├── deploy.ts
│   └── fhevm-lint.js
├── frontend/
│   ├── src/
│   │   └── App.tsx
│   └── package.json
├── hardhat.config.ts
├── package.json
└── SKILL.md
```

## Deployment Checklist

Before deploying to testnet or mainnet:

- [ ] All encrypted values have `FHE.allowThis()` or `FHE.allow()`
- [ ] All external encrypted inputs use `FHE.fromExternal(value, proof)`
- [ ] No encrypted values in `require()` conditions
- [ ] No plaintext decryption attempts in Solidity
- [ ] No encrypted values in event parameters
- [ ] All tests pass with encrypted inputs
- [ ] `npm run fhevm:lint` passes with zero errors
- [ ] Frontend decryption flow tested with real wallet

## Reference Files

When generating code, consult these reference files for detailed patterns:

- `references/fhevm-patterns.md` — Core FHEVM operation patterns
- `references/encrypted-types.md` — Full type matrix and conversions
- `references/acl-and-permissions.md` — Access control deep dive
- `references/input-proofs.md` — Input proof generation and validation
- `references/decryption-flows.md` — User decryption and public decrypt patterns
- `references/erc7984-confidential-token.md` — ERC-7984 token standard
- `references/frontend-fhevmjs.md` — Frontend integration with fhevmjs
- `references/testing-hardhat.md` — Hardhat testing patterns
- `references/anti-patterns.md` — Common mistakes and how to avoid them

## Examples

For production-quality reference implementations:

- `examples/confidential-voting/` — Encrypted voting with tally decryption
- `examples/sealed-bid-auction/` — Sealed-bid auction with encrypted bids
- `examples/confidential-erc7984/` — Full ERC-7984 confidential token
- `examples/erc20-wrapper/` — ERC-20 ↔ ERC-7984 wrapping flow
- `examples/frontend-decrypt-demo/` — React frontend with decrypt button

## Error Prevention

After generating any FHEVM code, run the validator:

```bash
node scripts/fhevm-lint.js
# or
npm run fhevm:lint
```

The validator checks every `.sol` file for:

1. Missing `ZamaEthereumConfig` import
2. Missing `FHE.allowThis()` after storing encrypted values
3. Missing `FHE.allow()` for user decryption access
4. Encrypted values in plain `require()` conditions
5. Returning encrypted values without ACL setup
6. Missing `inputProof` for external encrypted inputs
7. Attempting to decrypt inside Solidity
8. Exposing encrypted handles in public events

If the validator finds errors, fix them before testing or deploying.
