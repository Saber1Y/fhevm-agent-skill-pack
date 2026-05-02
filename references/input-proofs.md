# Input Proofs

Input proofs are zero-knowledge proofs that validate encrypted values coming from outside the contract are well-formed and honestly generated.

## Why Input Proofs Are Required

When a user sends an encrypted value to a contract, the contract must verify:

1. **The ciphertext is well-formed** — it's a valid FHE encryption
2. **The user knows the plaintext** — they didn't just fabricate a ciphertext
3. **The ciphertext matches the claimed input** — the proof binds to the actual value

Without input proofs, a malicious user could send malformed ciphertexts that break the coprocessor or leak information.

## How Input Proofs Work

1. **User encrypts a value** locally using fhevmjs
2. **fhevmjs generates a ZK proof** alongside the ciphertext
3. **User sends both** (encrypted handle + proof) to the contract
4. **Contract calls** `FHE.fromExternal(encryptedInput, inputProof)`
5. **FHEVM verifies the proof** on-chain — reverts if invalid

## Contract Side

### Basic Input Proof Validation

```solidity
contract MyContract is SepoliaConfig {
    function setValue(
        externalEuint32 input,
        bytes calldata inputProof
    ) external {
        euint32 value = FHE.fromExternal(input, inputProof);
        FHE.allowThis(value);
        storedValue = value;
    }
}
```

### Multiple Encrypted Inputs

```solidity
function transfer(
    address to,
    externalEuint64 amount,
    bytes calldata amountProof
) external {
    euint64 amt = FHE.fromExternal(amount, amountProof);
    FHE.allowThis(amt);
    // ... rest of logic
}
```

### Function Signature Rules

- `externalEuint*` must always be paired with a `bytes calldata inputProof` parameter
- The proof parameter should immediately follow the encrypted input
- Name the proof parameter as `<inputName>Proof` for clarity

## Frontend Side

### Generating Encrypted Inputs with fhevmjs

```typescript
import { createInstance } from "fhevmjs";
import { BigNumber } from "ethers";

// 1. Create FHE instance
const instance = await createInstance({
  chainId: provider.network.chainId,
  publicKey: await provider.call({ to: fhevmAddress }),
  networkFheParams: await getNetworkFheParams(provider),
});

// 2. Encrypt a value
const encrypted = instance.encrypt32(100);

// 3. Send to contract
await contract.setValue(
  encrypted.handles[0],  // The encrypted handle
  encrypted.inputProof   // The ZK proof
);
```

### Encryption Methods by Type

```typescript
// euint4
const enc4 = instance.encrypt4(value);

// euint8
const enc8 = instance.encrypt8(value);

// euint16
const enc16 = instance.encrypt16(value);

// euint32
const enc32 = instance.encrypt32(value);

// euint64
const enc64 = instance.encrypt64(value);

// euint128
const enc128 = instance.encrypt128(value);

// euint256
const enc256 = instance.encrypt256(value);

// ebool
const encBool = instance.encryptBool(value);
```

Each returns an object with:
- `handles` — array of encrypted handles (usually `[0]` for single values)
- `inputProof` — the ZK proof bytes

## Hardhat Test Side

### Creating Encrypted Inputs in Tests

```typescript
import { createInstance } from "fhevmjs";
import { FhevmCoinSigner } from "@fhevm/hardhat";

describe("Input Proofs", function () {
  let contract: any;
  let signer: FhevmCoinSigner;
  let instance: any;

  beforeEach(async function () {
    const Contract = await ethers.getContractFactory("MyContract");
    contract = await Contract.deploy();

    const signers = await ethers.getSigners();
    signer = signers[0] as FhevmCoinSigner;

    instance = await createInstance({
      chainId: (await signer.provider.getNetwork()).chainId,
      publicKey: await signer.provider.call({
        to: "0x000000000000000000000000000000000000005d",
      }),
    });
  });

  it("should accept encrypted input with proof", async function () {
    const encrypted = instance.encrypt32(42);

    await contract.setValue(
      encrypted.handles[0],
      encrypted.inputProof
    );

    const result = await contract.getValue();
    const decrypted = await signer.userDecryptEuint(result);
    expect(decrypted).to.equal(42);
  });
});
```

## Common Input Proof Mistakes

### 1. Missing proof parameter

```solidity
// WRONG
function deposit(externalEuint32 amount) external {
    euint32 value = FHE.fromExternal(amount);  // Missing proof!
}

// CORRECT
function deposit(externalEuint32 amount, bytes calldata proof) external {
    euint32 value = FHE.fromExternal(amount, proof);
}
```

### 2. Swapped order of parameters

```solidity
// WRONG — proof must be the second parameter
function deposit(bytes calldata proof, externalEuint32 amount) external {
    euint32 value = FHE.fromExternal(amount, proof);
}

// CORRECT
function deposit(externalEuint32 amount, bytes calldata proof) external {
    euint32 value = FHE.fromExternal(amount, proof);
}
```

### 3. Using wrong encryption method

```typescript
// WRONG — encrypting 64-bit value as 32-bit
const encrypted = instance.encrypt32(BigInt("9999999999999"));

// CORRECT — match the contract's expected type
const encrypted = instance.encrypt64(BigInt("9999999999999"));
```

## Input Proof Flow Summary

```
┌─────────────────────────────────────────────────────┐
│  Frontend                                           │
│  1. instance.encrypt32(value)                       │
│  2. Returns: { handles[0], inputProof }             │
└──────────────────────┬──────────────────────────────┘
                       │ contract.setValue(handle, proof)
                       ▼
┌─────────────────────────────────────────────────────┐
│  Contract (Solidity)                                │
│  1. FHE.fromExternal(encryptedInput, inputProof)    │
│  2. Verifies proof on-chain                         │
│  3. Returns usable euint32                          │
│  4. FHE.allowThis(value)                            │
└─────────────────────────────────────────────────────┘
```
