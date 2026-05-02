# Decryption Flows

FHEVM never decrypts inside Solidity. All decryption happens on the frontend via fhevmjs using EIP-712 signed requests.

## Architecture

```
Solidity Contract          FHE Coprocessor          Frontend (fhevmjs)
─────────────────          ───────────────          ──────────────────
Stores euint32 handles  ←→ Manages ciphertexts  ←→ Requests decryption
NEVER decrypts               Validates ACL            User signs EIP-712
Returns handles                                    Gets plaintext back
```

## User Decryption (EIP-712 Flow)

This is the primary way users decrypt encrypted values. It requires the user to sign an EIP-712 message proving they have access.

### Contract Setup

```solidity
contract MyContract is SepoliaConfig {
    mapping(address => euint32) private balances;

    function deposit(
        externalEuint32 amount,
        bytes calldata proof
    ) external {
        euint32 value = FHE.fromExternal(amount, proof);
        FHE.allowThis(value);
        FHE.allow(value, msg.sender);  // Critical: user must have ACL
        balances[msg.sender] = FHE.add(balances[msg.sender], value);
        FHE.allowThis(balances[msg.sender]);
        FHE.allow(balances[msg.sender], msg.sender);
    }

    function getBalance() external view returns (euint32) {
        return balances[msg.sender];
    }
}
```

### Frontend Decryption

```typescript
import { createInstance, Handle } from "fhevmjs";

async function decryptUserBalance(
  provider: any,
  contract: any,
  contractAddress: string,
  userAddress: string
): Promise<bigint> {
  // 1. Create FHE instance
  const chainId = (await provider.getNetwork()).chainId;
  const instance = await createInstance({
    chainId,
    publicKey: await provider.call({
      to: "0x000000000000000000000000000000000000005d",
    }),
  });

  // 2. Get encrypted handle from contract
  const encryptedBalance = await contract.getBalance();

  // 3. Request user decryption (triggers wallet signature)
  const decrypted = await instance.userDecryptEuint(
    Handle.euint32(encryptedBalance),
    contractAddress,
    userAddress
  );

  return decrypted;
}
```

### UI Flow

```
User clicks "Decrypt Balance"
  → Wallet prompts for signature (EIP-712)
    → User signs
      → fhevmjs sends signed request to gateway
        → Gateway returns decrypted plaintext
          → Display value in UI
```

## Public Decryption

For values that should be publicly readable (e.g., voting results after a deadline):

```solidity
contract MyContract is SepoliaConfig {
    euint32 private encryptedResult;

    function requestDecryption() external {
        FHE.requestDecryption(encryptedResult);
    }

    function getDecryptedResult() external view returns (uint32) {
        return FHE.getDecryptedResult(encryptedResult);
    }
}
```

**Note**: Public decryption has a delay period for security. It's not instant.

## Decryption by Type

```typescript
// euint32 decryption
const decrypted = await instance.userDecryptEuint(
  Handle.euint32(encryptedHandle),
  contractAddress,
  userAddress
);

// euint64 decryption
const decrypted = await instance.userDecryptEuint(
  Handle.euint64(encryptedHandle),
  contractAddress,
  userAddress
);

// euint256 decryption
const decrypted = await instance.userDecryptEuint(
  Handle.euint256(encryptedHandle),
  contractAddress,
  userAddress
);

// ebool decryption
const decrypted = await instance.userDecryptEbool(
  Handle.ebool(encryptedHandle),
  contractAddress,
  userAddress
);

// eaddress decryption
const decrypted = await instance.userDecryptEaddress(
  Handle.eaddress(encryptedHandle),
  contractAddress,
  userAddress
);
```

## React Hook Pattern

```typescript
import { useState, useCallback } from "react";
import { createInstance, Handle } from "fhevmjs";

export function useDecrypt(provider: any, contractAddress: string) {
  const [decrypting, setDecrypting] = useState(false);

  const decrypt = useCallback(
    async (encryptedHandle: bigint, type: string) => {
      setDecrypting(true);
      try {
        const chainId = (await provider.getNetwork()).chainId;
        const instance = await createInstance({
          chainId,
          publicKey: await provider.call({
            to: "0x000000000000000000000000000000000000005d",
          }),
        });

        const signer = (await provider.getSigner()).getAddress();

        let decrypted;
        switch (type) {
          case "euint32":
            decrypted = await instance.userDecryptEuint(
              Handle.euint32(encryptedHandle),
              contractAddress,
              signer
            );
            break;
          case "euint64":
            decrypted = await instance.userDecryptEuint(
              Handle.euint64(encryptedHandle),
              contractAddress,
              signer
            );
            break;
          case "ebool":
            decrypted = await instance.userDecryptEbool(
              Handle.ebool(encryptedHandle),
              contractAddress,
              signer
            );
            break;
          default:
            throw new Error(`Unsupported type: ${type}`);
        }

        return decrypted;
      } finally {
        setDecrypting(false);
      }
    },
    [provider, contractAddress]
  );

  return { decrypt, decrypting };
}
```

## Usage in Component

```typescript
function BalanceDisplay({ contract }: { contract: any }) {
  const { decrypt, decrypting } = useDecrypt(provider, contractAddress);
  const [balance, setBalance] = useState<string | null>(null);

  const handleDecrypt = async () => {
    const encrypted = await contract.getBalance();
    const plain = await decrypt(encrypted, "euint32");
    setBalance(plain.toString());
  };

  return (
    <div>
      {balance !== null ? (
        <span>Balance: {balance}</span>
      ) : (
        <button onClick={handleDecrypt} disabled={decrypting}>
          {decrypting ? "Decrypting..." : "Decrypt Balance"}
        </button>
      )}
    </div>
  );
}
```

## Decryption Checklist

- [ ] `FHE.allow(value, user)` was called when the value was stored
- [ ] Frontend has correct fhevmjs instance with chainId and publicKey
- [ ] Using the correct Handle type (euint32, euint64, etc.)
- [ ] Contract address matches the deployed contract
- [ ] User address matches the ACL-granted address
- [ ] Wallet is connected and ready to sign

## Common Mistakes

### 1. Decrypting without ACL

```solidity
// WRONG — user was never granted access
FHE.allowThis(value);
balances[msg.sender] = value;  // user can't decrypt!

// CORRECT
FHE.allowThis(value);
FHE.allow(value, msg.sender);  // now user can decrypt
balances[msg.sender] = value;
```

### 2. Wrong Handle type in frontend

```typescript
// WRONG — contract stores euint64, frontend uses euint32
const decrypted = await instance.userDecryptEuint(
  Handle.euint32(encryptedHandle),  // Wrong type!
  contractAddress,
  signer
);

// CORRECT
const decrypted = await instance.userDecryptEuint(
  Handle.euint64(encryptedHandle),
  contractAddress,
  signer
);
```

### 3. Attempting to decrypt in Solidity

```solidity
// WRONG — impossible in FHEVM
function revealBalance() external view returns (uint32) {
    return uint32(balances[msg.sender]);  // Cannot cast euint32 to uint32!
}
```
