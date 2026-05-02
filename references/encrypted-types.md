# Encrypted Types Reference

Complete type matrix for Zama FHEVM. Every encrypted type is a **handle** — an opaque reference to a ciphertext managed by the FHE coprocessor.

## Type Matrix

| Solidity Type | External Input Type | Bit Size | Use Case |
|---|---|---|---|
| `euint4` | `externalEuint4` | 4 | Tiny counters, small enums |
| `euint8` | `externalEuint8` | 8 | Small integers, vote counts |
| `euint16` | `externalEuint16` | 16 | Medium integers, percentages |
| `euint32` | `externalEuint32` | 32 | General purpose, balances |
| `euint64` | `externalEuint64` | 64 | Large numbers, timestamps |
| `euint128` | `externalEuint128` | 128 | Big integers, token amounts |
| `euint256` | `externalEuint256` | 256 | Maximum precision, ERC-7984 |
| `ebool` | `externalEbool` | 1 | Encrypted conditions |
| `eaddress` | `externalEaddress` | 160 | Encrypted addresses |

## External Types

External types represent encrypted values coming **from outside the contract** (user inputs, other contracts). They must be converted using `FHE.fromExternal()`:

```solidity
function acceptInput(
    externalEuint32 encryptedInput,
    bytes calldata inputProof
) external {
    euint32 value = FHE.fromExternal(encryptedInput, inputProof);
    // value is now a usable euint32 inside the contract
}
```

## Internal Types

Internal types (`euint32`, `ebool`, etc.) are the types used **inside** Solidity contracts. They are the result of:

1. Converting external types via `FHE.fromExternal()`
2. FHE operations (`FHE.add`, `FHE.mul`, etc.)
3. Storing encrypted state variables

## Converting Plain Values to Encrypted

```solidity
// From plain uint to encrypted
euint32 encryptedValue = FHE.asEuint32(42);
ebool encryptedBool = FHE.asEbool(true);
```

## Casting Between Encrypted Types

### Widening (safe)

```solidity
euint8 small = FHE.asEuint8(10);
euint32 medium = FHE.asEuint32(small);
euint64 large = FHE.asEuint64(small);
euint256 huge = FHE.asEuint256(small);
```

### Narrowing (truncates)

```solidity
euint32 medium = FHE.asEuint32(300);
euint8 small = FHE.asEuint8(medium);  // truncates to 44 (300 % 256)
```

## Supported Operations by Type

| Operation | euint4 | euint8 | euint16 | euint32 | euint64 | euint128 | euint256 | ebool | eaddress |
|---|---|---|---|---|---|---|---|---|---|
| `add` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `sub` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `mul` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `div` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `rem` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `eq` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ne` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `gt` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `lt` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `gte` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `lte` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `and` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `or` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `xor` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `not` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `shl` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `shr` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `min` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `max` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `select` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Type Selection Guide

- **Votes, small counters** → `euint8`
- **Percentages, ratings** → `euint16`
- **Balances, general values** → `euint32`
- **Large amounts, timestamps** → `euint64`
- **Token amounts (ERC-7984)** → `euint256`
- **Conditions, guards** → `ebool`
- **Private addresses** → `eaddress`

## Important Notes

1. **No signed integers** — FHEVM only supports unsigned encrypted integers
2. **No floating point** — all encrypted types are integers
3. **Overflow behavior** — encrypted arithmetic wraps like Solidity uint types
4. **Gas cost** — larger types cost more gas; choose the smallest type that fits
5. **Handles are not comparable** — two handles to the same value are different handles
