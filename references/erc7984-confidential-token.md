# ERC-7984 Confidential Token

ERC-7984 is Zama's confidential token standard, built on FHEVM. It provides encrypted balances, confidential transfers, and ERC-20 interoperability.

## Overview

ERC-7984 extends ERC-20 concepts with full confidentiality:

- **Encrypted balances** — `euint256` per holder
- **Encrypted transfer amounts** — `externalEuint256` + `inputProof`
- **Encrypted allowances** — `euint256` for approvals
- **Confidential transfers** — amounts hidden on-chain
- **ERC-20 wrapping** — convert between ERC-20 and ERC-7984
- **Operator callbacks** — custom logic on transfer/allowance changes

## Basic Implementation

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC7984 } from "@openzeppelin/fhevm/token/ERC7984/ERC7984.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract MyConfidentialToken is ERC7984, SepoliaConfig {
    constructor() ERC7984("My Confidential Token", "MCT") {
        _mintConfidential(msg.sender, 1_000_000);
    }
}
```

## Core Functions

### Confidential Transfer

```solidity
function transfer(
    address to,
    externalEuint256 amount,
    bytes calldata inputProof
) external returns (bool);
```

The `amount` is encrypted. The recipient and amount are both hidden.

### Confidential Allowance

```solidity
function approve(
    address spender,
    externalEuint256 amount,
    bytes calldata inputProof
) external returns (bool);
```

Encrypted approval amount — spender doesn't know the limit.

### Confidential Transfer From

```solidity
function transferFrom(
    address from,
    address to,
    externalEuint256 amount,
    bytes calldata inputProof
) external returns (bool);
```

Uses encrypted allowance to verify spender has permission.

### Balance Query

```solidity
function balanceOf(address account) external view returns (euint256);
```

Returns an encrypted handle. User decrypts via fhevmjs.

### Allowance Query

```solidity
function allowance(address owner, address spender) external view returns (euint256);
```

Returns encrypted allowance handle.

## Wrapping ERC-20 to ERC-7984

The wrapper pattern lets users convert standard ERC-20 tokens to confidential ERC-7984 tokens.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC7984 } from "@openzeppelin/fhevm/token/ERC7984/ERC7984.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { FHE, euint256 } from "@fhevm/solidity/lib/FHE.sol";

contract ConfidentialWrapper is ERC7984, SepoliaConfig {
    ERC20 public immutable wrappedToken;

    constructor(
        string memory name,
        string memory symbol,
        address _wrappedToken
    ) ERC7984(name, symbol) {
        wrappedToken = ERC20(_wrappedToken);
    }

    function wrap(uint256 amount) external {
        wrappedToken.transferFrom(msg.sender, address(this), amount);
        _mintConfidential(msg.sender, amount);
    }

    function unwrap(uint256 amount) external {
        _burnConfidential(msg.sender, amount);
        wrappedToken.transfer(msg.sender, amount);
    }

    function wrapBalanceOf(address account) external view returns (euint256) {
        return balanceOf(account);
    }
}
```

## Minting and Burning

### Confidential Mint

```solidity
function _mintConfidential(address to, uint256 amount) internal;
```

Mints a plain amount but stores it as encrypted balance.

### Confidential Burn

```solidity
function _burnConfidential(address from, uint256 amount) internal;
```

Burns from encrypted balance.

## Operator Pattern

ERC-7984 supports operators — addresses that can transfer on behalf of token holders.

```solidity
function isOperator(address operator, address account) external view returns (bool);

function setOperator(address operator, bool authorized) external;
```

## Events

ERC-7984 emits encrypted transfer events. The amounts are handles, not plaintext.

```solidity
event Transfer(address indexed from, address indexed to, euint256 amount);
event Approval(address indexed owner, address indexed spender, euint256 amount);
```

## Complete ERC-7984 Token Example

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC7984 } from "@openzeppelin/fhevm/token/ERC7984/ERC7984.sol";
import { FHE, euint256, externalEuint256 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract PrivateToken is ERC7984, SepoliaConfig {
    uint256 public maxSupply;

    constructor(
        string memory name,
        string memory symbol,
        uint256 _maxSupply
    ) ERC7984(name, symbol) {
        maxSupply = _maxSupply;
    }

    function mint(
        address to,
        externalEuint256 amount,
        bytes calldata inputProof
    ) external onlyOwner {
        euint256 amt = FHE.fromExternal(amount, inputProof);
        FHE.allowThis(amt);

        euint256 currentTotal = totalSupply();
        euint256 newTotal = FHE.add(currentTotal, amt);
        FHE.allowThis(newTotal);

        require(
            FHE.decrypt(newTotal) <= maxSupply,
            "Exceeds max supply"
        );

        _mintConfidential(to, FHE.decrypt(amt));
    }

    function getBalance(address account) external view returns (euint256) {
        return balanceOf(account);
    }
}
```

## ERC-7984 vs ERC-20 Comparison

| Feature | ERC-20 | ERC-7984 |
|---|---|---|
| Balances | Public `uint256` | Encrypted `euint256` |
| Transfer amount | Public | Encrypted |
| Allowance | Public | Encrypted |
| Events | Plaintext amounts | Encrypted handles |
| Frontend access | Direct read | fhevmjs decryption |
| Input validation | Standard | Requires inputProof |
| Privacy | None | Full confidentiality |

## Best Practices

1. **Always use ERC7984 base contract** — don't implement from scratch
2. **Use `_mintConfidential` and `_burnConfidential`** — not raw state changes
3. **Set ACL on all encrypted values** — follow the standard ACL patterns
4. **Test with encrypted inputs** — use fhevmjs in Hardhat tests
5. **Provide clear frontend decryption UI** — users need to decrypt balances
