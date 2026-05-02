# Anti-Patterns and Common Mistakes

Every FHEVM anti-pattern with the wrong code, why it fails, and the correct fix. The linter (`scripts/fhevm-lint.js`) scans for these automatically.

## 1. Missing ZamaEthereumConfig Import

**Wrong**: Contract doesn't extend the network config, so FHE library has no coprocessor address.

```solidity
// WRONG
contract MyContract {
    function setValue(externalEuint32 input, bytes calldata proof) external {
        euint32 value = FHE.fromExternal(input, proof);
        storedValue = value;
    }
}
```

**Correct**: Inherit from the network config.

```solidity
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract MyContract is SepoliaConfig {
    // ...
}
```

**Why it fails**: Without the config, the FHE library doesn't know the coprocessor address. Transactions revert immediately.

**Linter check**: Scans for `is SepoliaConfig`, `is LocalFHEVMConfig`, or similar config inheritance.

## 2. Missing FHE.allowThis()

**Wrong**: Encrypted value is stored but the contract itself cannot access it.

```solidity
function deposit(externalEuint32 amount, bytes calldata proof) external {
    euint32 value = FHE.fromExternal(amount, proof);
    balances[msg.sender] = FHE.add(balances[msg.sender], value);
    // Missing: FHE.allowThis(balances[msg.sender])
}
```

**Correct**: Always allow the contract to use the encrypted result.

```solidity
function deposit(externalEuint32 amount, bytes calldata proof) external {
    euint32 value = FHE.fromExternal(amount, proof);
    FHE.allowThis(value);
    balances[msg.sender] = FHE.add(balances[msg.sender], value);
    FHE.allowThis(balances[msg.sender]);
}
```

**Why it fails**: FHE operations on a value the contract can't access will revert silently or produce unusable results.

**Linter check**: After `FHE.add`, `FHE.sub`, `FHE.mul`, etc. assignments to state variables, verifies `FHE.allowThis` is called on the result.

## 3. Missing FHE.allow() for User

**Wrong**: Contract can use the value, but the user can never decrypt it.

```solidity
function deposit(externalEuint32 amount, bytes calldata proof) external {
    euint32 value = FHE.fromExternal(amount, proof);
    FHE.allowThis(value);
    balances[msg.sender] = value;
    // Missing: FHE.allow(value, msg.sender)
}
```

**Correct**: Also grant the user decryption access.

```solidity
function deposit(externalEuint32 amount, bytes calldata proof) external {
    euint32 value = FHE.fromExternal(amount, proof);
    FHE.allowThis(value);
    FHE.allow(value, msg.sender);
    balances[msg.sender] = value;
}
```

**Why it fails**: Frontend decryption calls (`userDecryptEuint`) will fail with ACL errors.

**Linter check**: When `FHE.fromExternal` is used, checks for corresponding `FHE.allow` call with the user address.

## 4. Encrypted Value in Plain require()

**Wrong**: Encrypted values cannot be evaluated in standard require conditions.

```solidity
function withdraw(externalEuint32 amount, bytes calldata proof) external {
    euint32 amt = FHE.fromExternal(amount, proof);
    FHE.allowThis(amt);

    // WRONG — cannot compare encrypted value in require
    require(balances[msg.sender] >= amt, "Insufficient balance");
}
```

**Correct**: Use `FHE.select()` for conditional logic.

```solidity
function withdraw(externalEuint32 amount, bytes calldata proof) external {
    euint32 amt = FHE.fromExternal(amount, proof);
    FHE.allowThis(amt);

    ebool sufficient = FHE.gte(balances[msg.sender], amt);

    euint32 newBalance = FHE.select(
        sufficient,
        FHE.sub(balances[msg.sender], amt),
        balances[msg.sender]
    );
    FHE.allowThis(newBalance);
    FHE.allow(newBalance, msg.sender);
    balances[msg.sender] = newBalance;
}
```

**Why it fails**: Solidity cannot evaluate encrypted comparisons as boolean conditions. This will not compile.

**Linter check**: Scans for `require(` with `FHE.` comparison functions or encrypted state variables inside.

## 5. Returning Encrypted Values Without ACL

**Wrong**: Returns encrypted handles that no one can decrypt.

```solidity
function getBalance() external view returns (euint32) {
    return balances[msg.sender];
}
// If balances[msg.sender] was never given ACL, this handle is useless
```

**Correct**: Set ACL when the value is first created.

```solidity
function deposit(externalEuint32 amount, bytes calldata proof) external {
    euint32 value = FHE.fromExternal(amount, proof);
    FHE.allowThis(value);
    FHE.allow(value, msg.sender);
    balances[msg.sender] = value;
}

function getBalance() external view returns (euint32) {
    return balances[msg.sender];  // Now decryptable by msg.sender
}
```

**Why it fails**: Users receive a handle but `userDecryptEuint` fails with "access denied."

**Linter check**: Traces state variable assignments and verifies ACL was set before assignment.

## 6. Missing inputProof for External Inputs

**Wrong**: External encrypted inputs require a ZK proof parameter.

```solidity
// WRONG — missing proof parameter
function deposit(externalEuint32 amount) external {
    euint32 value = FHE.fromExternal(amount);  // Missing proof argument
}
```

**Correct**: Always include the proof parameter.

```solidity
function deposit(externalEuint32 amount, bytes calldata proof) external {
    euint32 value = FHE.fromExternal(amount, proof);
    FHE.allowThis(value);
    balances[msg.sender] = FHE.add(balances[msg.sender], value);
    FHE.allowThis(balances[msg.sender]);
    FHE.allow(balances[msg.sender], msg.sender);
}
```

**Why it fails**: `FHE.fromExternal` requires exactly 2 arguments. Missing proof = compile error.

**Linter check**: Scans function signatures for `externalEuint*` parameters, verifies `bytes` proof parameter exists.

## 7. Attempting to Decrypt Inside Solidity

**Wrong**: Solidity cannot decrypt FHEVM ciphertexts.

```solidity
// WRONG — impossible
function revealBalance() external view returns (uint32) {
    return uint32(balances[msg.sender]);
}

// WRONG — also impossible
function checkBalance() external view {
    if (balances[msg.sender] > 100) { ... }
}
```

**Correct**: Return the encrypted handle; decryption happens on frontend.

```solidity
function getBalance() external view returns (euint32) {
    return balances[msg.sender];
}
```

For comparisons, use FHE operations:

```solidity
ebool isOver100 = FHE.gt(balances[msg.sender], FHE.asEuint32(100));
euint32 result = FHE.select(isOver100, rewardAmount, FHE.asEuint32(0));
```

**Why it fails**: FHEVM is designed so decryption NEVER happens on-chain. Type casting from `euint32` to `uint32` is not supported.

**Linter check**: Scans for casts like `uint32(euint...)`, `uint256(euint...)`, etc.

## 8. Exposing Encrypted Handles in Events

**Wrong**: Encrypted handles in events are meaningless to off-chain listeners.

```solidity
// WRONG — encrypted handle in event
event BalanceUpdated(euint32 balance);
event Transfer(address from, address to, euint256 amount);
```

**Correct**: Emit events with identifiers, not the encrypted values themselves.

```solidity
event BalanceUpdated(address user);
event Transfer(address indexed from, address indexed to);
```

**Why it fails**: Events are indexed by off-chain tools (The Graph, block explorers). An encrypted handle is just a number with no meaning off-chain. It also leaks metadata about ciphertext operations.

**Linter check**: Scans `event` declarations for `euint*`, `ebool`, `eaddress` parameters.

## Quick Reference: Linter Checks

| # | Anti-Pattern | Linter Rule |
|---|---|---|
| 1 | Missing config import | `MISSING_CONFIG` |
| 2 | Missing FHE.allowThis | `MISSING_ALLOW_THIS` |
| 3 | Missing FHE.allow | `MISSING_ALLOW` |
| 4 | Encrypted in require | `ENCRYPTED_REQUIRE` |
| 5 | Return without ACL | `RETURN_NO_ACL` |
| 6 | Missing inputProof | `MISSING_PROOF` |
| 7 | Decrypt in Solidity | `DECRYPT_IN_SOLIDITY` |
| 8 | Encrypted in events | `ENCRYPTED_EVENT` |
