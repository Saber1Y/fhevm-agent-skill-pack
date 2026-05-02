# ACL and Permissions

FHEVM uses an Access Control List (ACL) system to control who can decrypt each encrypted value. Understanding ACL is critical — missing ACL calls are the #1 cause of broken FHEVM contracts.

## How ACL Works

Every encrypted value (`euint*`, `ebool`, `eaddress`) has an associated ACL. By default:

- **Only the creator** of an encrypted value can decrypt it
- **No one else** can access the plaintext, not even the contract

You must explicitly grant access using ACL functions.

## ACL Functions

### `FHE.allowThis(value)`

Grants the **current contract** permission to use and decrypt the encrypted value.

```solidity
euint32 value = FHE.fromExternal(input, proof);
FHE.allowThis(value);  // Contract can now read/use this value
storedValue = value;
```

**When to use**: After receiving any encrypted input from a user, before storing or operating on it.

### `FHE.allow(value, user)`

Grants a **specific address** permission to decrypt the encrypted value.

```solidity
function deposit(externalEuint32 amount, bytes calldata proof) external {
    euint32 value = FHE.fromExternal(amount, proof);
    FHE.allowThis(value);
    FHE.allow(value, msg.sender);  // User can decrypt their balance
    balances[msg.sender] = value;
}
```

**When to use**: Whenever a user needs to decrypt a value on the frontend (e.g., their own balance).

### `FHE.allowTransient(value, user)`

Grants **temporary** access for the duration of the current transaction only.

```solidity
function processWithAccess(externalEuint32 input, bytes calldata proof) external {
    euint32 value = FHE.fromExternal(input, proof);
    FHE.allowThis(value);
    FHE.allowTransient(value, msg.sender);
    // msg.sender can decrypt only during this tx
}
```

**When to use**: One-time operations where persistent access is not needed.

## ACL Decision Tree

When you create or receive an encrypted value, follow this checklist:

```
Is the value coming from outside (externalEuint*)?
  └─ YES → FHE.fromExternal(input, proof)
       └─ Does the contract need to use it?
            └─ YES → FHE.allowThis(value)
       └─ Does a user need to decrypt it?
            └─ YES → FHE.allow(value, userAddress)
       └─ Is it one-time only?
            └─ YES → FHE.allowTransient(value, userAddress)
```

## Common ACL Patterns

### Pattern 1: User deposits encrypted value

```solidity
function deposit(externalEuint32 amount, bytes calldata proof) external {
    euint32 value = FHE.fromExternal(amount, proof);
    FHE.allowThis(value);        // Contract reads it
    FHE.allow(value, msg.sender); // User can decrypt later
    balances[msg.sender] = FHE.add(balances[msg.sender], value);
    FHE.allowThis(balances[msg.sender]);
    FHE.allow(balances[msg.sender], msg.sender);
}
```

### Pattern 2: Encrypted transfer between users

```solidity
function transfer(
    address to,
    externalEuint32 amount,
    bytes calldata proof
) external {
    euint32 amt = FHE.fromExternal(amount, proof);
    FHE.allowThis(amt);

    ebool sufficient = FHE.gte(balances[msg.sender], amt);

    // Update sender balance
    euint32 senderNew = FHE.select(
        sufficient,
        FHE.sub(balances[msg.sender], amt),
        balances[msg.sender]
    );
    FHE.allowThis(senderNew);
    FHE.allow(senderNew, msg.sender);
    balances[msg.sender] = senderNew;

    // Update receiver balance
    euint32 receiverNew = FHE.select(
        sufficient,
        FHE.add(balances[to], amt),
        balances[to]
    );
    FHE.allowThis(receiverNew);
    FHE.allow(receiverNew, to);
    balances[to] = receiverNew;
}
```

### Pattern 3: Encrypted voting

```solidity
function vote(externalEuint8 choice, bytes calldata proof) external {
    require(!hasVoted[msg.sender], "Already voted");

    euint8 voteChoice = FHE.fromExternal(choice, proof);
    FHE.allowThis(voteChoice);

    voteCounts[voteChoice] = FHE.add(voteCounts[voteChoice], FHE.asEuint8(1));
    FHE.allowThis(voteCounts[voteChoice]);

    hasVoted[msg.sender] = true;

    // Voter can verify their choice was counted
    FHE.allow(voteChoice, msg.sender);
}
```

## ACL with Results of FHE Operations

Every FHE operation creates a **new handle**. The new handle does NOT inherit ACL from its inputs.

```solidity
// WRONG — result has no ACL
euint32 newBalance = FHE.add(oldBalance, amount);
balances[msg.sender] = newBalance;  // Nobody can decrypt newBalance!

// CORRECT — set ACL on the result
euint32 newBalance = FHE.add(oldBalance, amount);
FHE.allowThis(newBalance);
FHE.allow(newBalance, msg.sender);
balances[msg.sender] = newBalance;
```

## ACL Gotchas

1. **FHE.select returns a new handle** — must set ACL on the result
2. **FHE.add/sub/mul return new handles** — must set ACL on each result
3. **Storing in a mapping doesn't auto-ACL** — set ACL before or after storing
4. **ACL is per-handle, not per-variable** — reassigning a variable with a new handle loses ACL
5. **allowTransient is not persistent** — value becomes inaccessible after the transaction ends

## Best Practices

1. **Always set ACL immediately** after creating a new encrypted handle
2. **Use a helper function** for repetitive ACL patterns
3. **Test decryption** in Hardhat tests to verify ACL is correct
4. **Never assume** inherited ACL — each operation creates a fresh handle

```solidity
// Helper function
function _setACL(euint32 value, address user) internal {
    FHE.allowThis(value);
    FHE.allow(value, user);
}

// Usage
function deposit(externalEuint32 amount, bytes calldata proof) external {
    euint32 value = FHE.fromExternal(amount, proof);
    _setACL(value, msg.sender);
    balances[msg.sender] = FHE.add(balances[msg.sender], value);
    _setACL(balances[msg.sender], msg.sender);
}
```
