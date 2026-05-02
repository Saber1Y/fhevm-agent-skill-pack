# Frontend Integration with fhevmjs

Complete guide for integrating FHEVM contracts into React/TypeScript frontends using fhevmjs.

## Installation

```bash
npm install fhevmjs
```

## Creating an FHE Instance

The FHE instance is the entry point for all encryption and decryption operations.

```typescript
import { createInstance } from "fhevmjs";

async function getFhevmInstance(provider: any) {
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  // Get the FHE public key from the coprocessor
  const publicKey = await provider.call({
    to: "0x000000000000000000000000000000000000005d",
  });

  const instance = await createInstance({
    chainId,
    publicKey,
  });

  return instance;
}
```

## Encrypting Values

Encrypt values on the frontend to send as encrypted inputs to contracts.

```typescript
const instance = await getFhevmInstance(provider);

// Encrypt different types
const encrypted8 = instance.encrypt8(42);       // euint8
const encrypted16 = instance.encrypt16(1000);   // euint16
const encrypted32 = instance.encrypt32(50000);  // euint32
const encrypted64 = instance.encrypt64(BigInt("9999999999"));  // euint64
const encrypted256 = instance.encrypt256(BigInt("1000000000000000000"));  // euint256
const encryptedBool = instance.encryptBool(true);  // ebool

// Each returns: { handles: bigint[], inputProof: string }
```

## Sending Encrypted Transactions

```typescript
import { ethers } from "ethers";

async function depositToContract(
  provider: any,
  contractAddress: string,
  amount: number
) {
  const instance = await getFhevmInstance(provider);
  const encrypted = instance.encrypt32(amount);

  const contract = new ethers.Contract(
    contractAddress,
    ["function deposit(externalEuint32 amount, bytes calldata proof) external"],
    await provider.getSigner()
  );

  const tx = await contract.deposit(
    encrypted.handles[0],
    encrypted.inputProof
  );

  await tx.wait();
  return tx.hash;
}
```

## Decrypting Values

### User Decryption with EIP-712

```typescript
import { createInstance, Handle } from "fhevmjs";

async function decryptBalance(
  provider: any,
  contract: any,
  contractAddress: string
) {
  const instance = await getFhevmInstance(provider);
  const signer = await provider.getSigner();
  const userAddress = await signer.getAddress();

  // Get encrypted handle from contract
  const encryptedHandle = await contract.getBalance();

  // Decrypt — triggers wallet signature prompt
  const decrypted = await instance.userDecryptEuint(
    Handle.euint32(encryptedHandle),
    contractAddress,
    userAddress
  );

  return decrypted;
}
```

### Decrypting Multiple Values

```typescript
async function decryptAllBalances(
  provider: any,
  contract: any,
  contractAddress: string,
  users: string[]
) {
  const instance = await getFhevmInstance(provider);
  const signer = await provider.getSigner();
  const userAddress = await signer.getAddress();

  const results: Record<string, bigint> = {};

  for (const user of users) {
    const encryptedHandle = await contract.getBalance(user);
    const decrypted = await instance.userDecryptEuint(
      Handle.euint32(encryptedHandle),
      contractAddress,
      userAddress
    );
    results[user] = decrypted;
  }

  return results;
}
```

## React Integration

### FHEVM Provider Context

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createInstance } from "fhevmjs";

interface FhevmContextType {
  instance: any;
  loading: boolean;
  error: string | null;
}

const FhevmContext = createContext<FhevmContextType | null>(null);

export function FhevmProvider({ children, provider }: { children: ReactNode; provider: any }) {
  const [instance, setInstance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const network = await provider.getNetwork();
        const publicKey = await provider.call({
          to: "0x000000000000000000000000000000000000005d",
        });

        const fheInstance = await createInstance({
          chainId: Number(network.chainId),
          publicKey,
        });

        setInstance(fheInstance);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize FHEVM");
      } finally {
        setLoading(false);
      }
    }

    if (provider) {
      init();
    }
  }, [provider]);

  return (
    <FhevmContext.Provider value={{ instance, loading, error }}>
      {children}
    </FhevmContext.Provider>
  );
}

export function useFhevm() {
  const context = useContext(FhevmContext);
  if (!context) {
    throw new Error("useFhevm must be used within FhevmProvider");
  }
  return context;
}
```

### Decrypt Button Component

```typescript
import { useState } from "react";
import { useFhevm } from "./FhevmProvider";
import { Handle } from "fhevmjs";

interface DecryptButtonProps {
  encryptedHandle: bigint;
  type: "euint32" | "euint64" | "euint256" | "ebool";
  contractAddress: string;
  onDecrypt: (value: bigint) => void;
  label?: string;
}

export function DecryptButton({
  encryptedHandle,
  type,
  contractAddress,
  onDecrypt,
  label = "Decrypt",
}: DecryptButtonProps) {
  const { instance } = useFhevm();
  const [decrypting, setDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDecrypt = async () => {
    if (!instance) return;
    setDecrypting(true);
    setError(null);

    try {
      const provider = (window as any).ethereum;
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      let decrypted: bigint;

      switch (type) {
        case "euint32":
          decrypted = await instance.userDecryptEuint(
            Handle.euint32(encryptedHandle),
            contractAddress,
            userAddress
          );
          break;
        case "euint64":
          decrypted = await instance.userDecryptEuint(
            Handle.euint64(encryptedHandle),
            contractAddress,
            userAddress
          );
          break;
        case "euint256":
          decrypted = await instance.userDecryptEuint(
            Handle.euint256(encryptedHandle),
            contractAddress,
            userAddress
          );
          break;
        case "ebool":
          decrypted = await instance.userDecryptEbool(
            Handle.ebool(encryptedHandle),
            contractAddress,
            userAddress
          );
          break;
      }

      onDecrypt(decrypted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decryption failed");
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <div>
      <button onClick={handleDecrypt} disabled={decrypting || !instance}>
        {decrypting ? "Decrypting..." : label}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
```

### Voting Component Example

```typescript
import { useState } from "react";
import { useFhevm } from "./FhevmProvider";
import { DecryptButton } from "./DecryptButton";
import { Handle } from "fhevmjs";
import { ethers } from "ethers";

export function VotingApp({ contract, contractAddress }: { contract: any; contractAddress: string }) {
  const { instance } = useFhevm();
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [tally, setTally] = useState<Record<string, string>>({});

  const handleVote = async (choice: number) => {
    if (!instance) return;

    const encrypted = instance.encrypt8(choice);
    const tx = await contract.vote(encrypted.handles[0], encrypted.inputProof);
    await tx.wait();
    setVoteSubmitted(true);
  };

  const handleDecryptTally = async (option: number) => {
    const encryptedTally = await contract.getVoteCount(option);
    setTally((prev) => ({
      ...prev,
      [option]: encryptedTally.toString(),
    }));
  };

  return (
    <div>
      <h2>Confidential Voting</h2>

      {!voteSubmitted ? (
        <div>
          <button onClick={() => handleVote(0)}>Vote Option A</button>
          <button onClick={() => handleVote(1)}>Vote Option B</button>
          <button onClick={() => handleVote(2)}>Vote Option C</button>
        </div>
      ) : (
        <p>Your vote has been recorded.</p>
      )}

      <h3>Results (decrypt to view)</h3>
      {[0, 1, 2].map((option) => (
        <div key={option}>
          <span>Option {String.fromCharCode(65 + option)}: </span>
          <DecryptButton
            encryptedHandle={BigInt(0)}
            type="euint8"
            contractAddress={contractAddress}
            onDecrypt={(value) =>
              setTally((prev) => ({ ...prev, [option]: value.toString() }))
            }
            label={`Decrypt Option ${String.fromCharCode(65 + option)}`}
          />
          {tally[option] && <span>{tally[option]} votes</span>}
        </div>
      ))}
    </div>
  );
}
```

## Event Listening

```typescript
// Listen for encrypted transfer events
contract.on("Transfer", (from, to, encryptedAmount, event) => {
  console.log(`Transfer from ${from} to ${to}`);
  // encryptedAmount is a handle — decrypt if you have ACL
});

// Cleanup
contract.removeAllListeners("Transfer");
```

## Error Handling

```typescript
async function safeDecrypt(instance: any, handle: bigint, contractAddress: string, userAddress: string) {
  try {
    const decrypted = await instance.userDecryptEuint(
      Handle.euint32(handle),
      contractAddress,
      userAddress
    );
    return { success: true, value: decrypted };
  } catch (err) {
    if (err.message?.includes("ACL")) {
      return { success: false, error: "No permission to decrypt this value" };
    }
    if (err.message?.includes("signature")) {
      return { success: false, error: "User rejected signature" };
    }
    return { success: false, error: "Decryption failed" };
  }
}
```
