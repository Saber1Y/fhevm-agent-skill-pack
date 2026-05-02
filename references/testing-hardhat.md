# Hardhat Testing for FHEVM

Comprehensive testing patterns for FHEVM contracts using the Hardhat FHEVM plugin.

## Project Setup

### hardhat.config.ts

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@fhevm/hardhat-plugin";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;
```

### package.json Scripts

```json
{
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "node": "hardhat node",
    "deploy": "hardhat run scripts/deploy.ts --network localhost",
    "deploy:sepolia": "hardhat run scripts/deploy.ts --network sepolia"
  }
}
```

## Basic Test Structure

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "fhevmjs";
import type { FhevmCoinSigner } from "@fhevm/hardhat";
import type { MyContract } from "../typechain-types";

describe("MyContract", function () {
  let contract: MyContract;
  let owner: FhevmCoinSigner;
  let user1: FhevmCoinSigner;
  let user2: FhevmCoinSigner;
  let fhevmInstance: any;

  beforeEach(async function () {
    // Deploy contract
    const Contract = await ethers.getContractFactory("MyContract");
    contract = await Contract.deploy();
    await contract.waitForDeployment();

    // Get signers
    const signers = await ethers.getSigners();
    owner = signers[0] as FhevmCoinSigner;
    user1 = signers[1] as FhevmCoinSigner;
    user2 = signers[2] as FhevmCoinSigner;

    // Create FHEVM instance
    const network = await owner.provider.getNetwork();
    fhevmInstance = await createInstance({
      chainId: Number(network.chainId),
      publicKey: await owner.provider.call({
        to: "0x000000000000000000000000000000000000005d",
      }),
    });
  });

  it("should deploy successfully", async function () {
    const address = await contract.getAddress();
    expect(address).to.properAddress;
  });
});
```

## Testing Encrypted Inputs

```typescript
it("should accept encrypted input", async function () {
  const encrypted = fhevmInstance.encrypt32(100);

  const tx = await contract.setValue(
    encrypted.handles[0],
    encrypted.inputProof
  );
  await tx.wait();

  const storedValue = await contract.getValue();
  expect(storedValue).to.be.a("bigint");
});
```

## Testing User Decryption

```typescript
it("should allow user to decrypt their value", async function () {
  const encrypted = fhevmInstance.encrypt32(42);

  await contract.setValue(
    encrypted.handles[0],
    encrypted.inputProof
  );

  const storedHandle = await contract.getValue();

  // User decrypts their value
  const decrypted = await user1.userDecryptEuint(storedHandle);
  expect(decrypted).to.equal(42n);
});
```

## Testing Encrypted Arithmetic

```typescript
it("should correctly add encrypted values", async function () {
  const enc1 = fhevmInstance.encrypt32(50);
  const enc2 = fhevmInstance.encrypt32(30);

  await contract.setValue(enc1.handles[0], enc1.inputProof);
  await contract.add(enc2.handles[0], enc2.inputProof);

  const result = await contract.getValue();
  const decrypted = await owner.userDecryptEuint(result);
  expect(decrypted).to.equal(80n);
});
```

## Testing ACL

```typescript
it("should not allow unauthorized user to decrypt", async function () {
  const encrypted = fhevmInstance.encrypt32(100);

  await contract.setValue(
    encrypted.handles[0],
    encrypted.inputProof
  );

  const storedHandle = await contract.getValue();

  // Owner can decrypt
  const ownerValue = await owner.userDecryptEuint(storedHandle);
  expect(ownerValue).to.equal(100n);

  // Other user cannot decrypt (may fail or return wrong value)
  // This depends on your ACL implementation
});
```

## Testing Confidential Voting

```typescript
describe("ConfidentialVoting", function () {
  let voting: any;
  let fhevmInstance: any;
  let owner: FhevmCoinSigner;
  let voter1: FhevmCoinSigner;
  let voter2: FhevmCoinSigner;

  beforeEach(async function () {
    const Voting = await ethers.getContractFactory("ConfidentialVoting");
    voting = await Voting.deploy(["Alice", "Bob", "Charlie"]);
    await voting.waitForDeployment();

    const signers = await ethers.getSigners();
    owner = signers[0] as FhevmCoinSigner;
    voter1 = signers[1] as FhevmCoinSigner;
    voter2 = signers[2] as FhevmCoinSigner;

    const network = await owner.provider.getNetwork();
    fhevmInstance = await createInstance({
      chainId: Number(network.chainId),
      publicKey: await owner.provider.call({
        to: "0x000000000000000000000000000000000000005d",
      }),
    });
  });

  it("should record encrypted votes", async function () {
    // Voter 1 votes for candidate 0
    const vote1 = fhevmInstance.encrypt8(0);
    await voting
      .connect(voter1)
      .vote(vote1.handles[0], vote1.inputProof);

    // Voter 2 votes for candidate 1
    const vote2 = fhevmInstance.encrypt8(1);
    await voting
      .connect(voter2)
      .vote(vote2.handles[0], vote2.inputProof);

    // Verify vote counts are encrypted
    const count0 = await voting.getVoteCount(0);
    const count1 = await voting.getVoteCount(1);

    expect(count0).to.be.a("bigint");
    expect(count1).to.be.a("bigint");
  });

  it("should prevent double voting", async function () {
    const vote = fhevmInstance.encrypt8(0);
    await voting.connect(voter1).vote(vote.handles[0], vote.inputProof);

    await expect(
      voting.connect(voter1).vote(vote.handles[0], vote.inputProof)
    ).to.be.revertedWith("Already voted");
  });

  it("should allow decrypting final tally", async function () {
    const vote1 = fhevmInstance.encrypt8(0);
    await voting
      .connect(voter1)
      .vote(vote1.handles[0], vote1.inputProof);

    const vote2 = fhevmInstance.encrypt8(0);
    await voting
      .connect(voter2)
      .vote(vote2.handles[0], vote2.inputProof);

    const count0 = await voting.getVoteCount(0);
    const decrypted = await owner.userDecryptEuint(count0);
    expect(decrypted).to.equal(2n);
  });
});
```

## Testing Confidential Token (ERC-7984)

```typescript
describe("ConfidentialToken", function () {
  let token: any;
  let fhevmInstance: any;
  let owner: FhevmCoinSigner;
  let user1: FhevmCoinSigner;
  let user2: FhevmCoinSigner;

  beforeEach(async function () {
    const Token = await ethers.getContractFactory("ConfidentialToken");
    token = await Token.deploy();
    await token.waitForDeployment();

    const signers = await ethers.getSigners();
    owner = signers[0] as FhevmCoinSigner;
    user1 = signers[1] as FhevmCoinSigner;
    user2 = signers[2] as FhevmCoinSigner;

    const network = await owner.provider.getNetwork();
    fhevmInstance = await createInstance({
      chainId: Number(network.chainId),
      publicKey: await owner.provider.call({
        to: "0x000000000000000000000000000000000000005d",
      }),
    });
  });

  it("should transfer confidentially", async function () {
    // Owner mints to user1
    const mintAmount = fhevmInstance.encrypt256(BigInt("1000"));
    await token.mint(
      user1.address,
      mintAmount.handles[0],
      mintAmount.inputProof
    );

    // User1 transfers to user2
    const transferAmount = fhevmInstance.encrypt256(BigInt("300"));
    await token
      .connect(user1)
      .transfer(user2.address, transferAmount.handles[0], transferAmount.inputProof);

    // Verify balances are encrypted
    const balance1 = await token.balanceOf(user1.address);
    const balance2 = await token.balanceOf(user2.address);

    const decrypted1 = await user1.userDecryptEuint(balance1);
    const decrypted2 = await user2.userDecryptEuint(balance2);

    expect(decrypted1).to.equal(700n);
    expect(decrypted2).to.equal(300n);
  });
});
```

## Testing Edge Cases

```typescript
it("should handle zero values", async function () {
  const encrypted = fhevmInstance.encrypt32(0);

  await contract.setValue(encrypted.handles[0], encrypted.inputProof);

  const result = await contract.getValue();
  const decrypted = await owner.userDecryptEuint(result);
  expect(decrypted).to.equal(0n);
});

it("should handle maximum values", async function () {
  const maxUint32 = 4294967295;
  const encrypted = fhevmInstance.encrypt32(maxUint32);

  await contract.setValue(encrypted.handles[0], encrypted.inputProof);

  const result = await contract.getValue();
  const decrypted = await owner.userDecryptEuint(result);
  expect(decrypted).to.equal(BigInt(maxUint32));
});

it("should revert with invalid proof", async function () {
  const invalidProof = "0x00";
  const encrypted = fhevmInstance.encrypt32(100);

  await expect(
    contract.setValue(encrypted.handles[0], invalidProof)
  ).to.be.reverted;
});
```

## Test Fixtures

```typescript
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

async function deployVotingFixture() {
  const Voting = await ethers.getContractFactory("ConfidentialVoting");
  const voting = await Voting.deploy(["Alice", "Bob", "Charlie"]);
  await voting.waitForDeployment();

  const signers = await ethers.getSigners();
  const network = await signers[0].provider.getNetwork();
  const fhevmInstance = await createInstance({
    chainId: Number(network.chainId),
    publicKey: await signers[0].provider.call({
      to: "0x000000000000000000000000000000000000005d",
    }),
  });

  return { voting, signers, fhevmInstance };
}

describe("ConfidentialVoting", function () {
  it("should work", async function () {
    const { voting, signers, fhevmInstance } = await loadFixture(deployVotingFixture);
    // Test logic here
  });
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/MyContract.test.ts

# Run with gas reporter
REPORT_GAS=true npm test

# Run with coverage
npx hardhat coverage
```
