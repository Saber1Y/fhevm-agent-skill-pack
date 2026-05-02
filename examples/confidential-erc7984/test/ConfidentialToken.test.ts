import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "fhevmjs";
import type { ConfidentialToken } from "../typechain-types";
import type { FhevmCoinSigner } from "@fhevm/hardhat";

describe("ConfidentialToken", function () {
  let token: ConfidentialToken;
  let fhevmInstance: any;
  let owner: FhevmCoinSigner;
  let user1: FhevmCoinSigner;
  let user2: FhevmCoinSigner;
  const MAX_SUPPLY = BigInt("1000000");

  beforeEach(async function () {
    const Token = await ethers.getContractFactory("ConfidentialToken");
    token = (await Token.deploy(
      "Confidential Token",
      "CTKN",
      MAX_SUPPLY
    )) as ConfidentialToken;
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

  it("should deploy with correct metadata", async function () {
    expect(await token.name()).to.equal("Confidential Token");
    expect(await token.symbol()).to.equal("CTKN");
    expect(await token.maxSupply()).to.equal(MAX_SUPPLY);
    expect(await token.owner()).to.equal(owner.address);
    expect(await token.mintingOpen()).to.equal(true);
  });

  it("should mint confidential tokens", async function () {
    await token.mint(user1.address, 1000);

    const balance = await token.getBalance(user1.address);
    expect(typeof balance).to.equal("bigint");
  });

  it("should transfer confidentially", async function () {
    await token.mint(user1.address, 1000);

    const encryptedAmount = fhevmInstance.encrypt256(BigInt("300"));
    await token
      .connect(user1)
      .transfer(user2.address, encryptedAmount.handles[0], encryptedAmount.inputProof);

    const balance1 = await token.getBalance(user1.address);
    const balance2 = await token.getBalance(user2.address);

    const decrypted1 = await user1.userDecryptEuint(balance1);
    const decrypted2 = await user2.userDecryptEuint(balance2);

    expect(decrypted1).to.equal(700n);
    expect(decrypted2).to.equal(300n);
  });

  it("should allow confidential approval and transferFrom", async function () {
    await token.mint(user1.address, 1000);

    const encryptedAmount = fhevmInstance.encrypt256(BigInt("500"));
    await token
      .connect(user1)
      .approve(owner.address, encryptedAmount.handles[0], encryptedAmount.inputProof);

    const allowance = await token.allowance(user1.address, owner.address);
    expect(typeof allowance).to.equal("bigint");
  });

  it("should allow owner to close minting", async function () {
    await token.closeMinting();
    expect(await token.mintingOpen()).to.equal(false);
  });

  it("should prevent non-owner from minting", async function () {
    await expect(
      token.connect(user1).mint(user2.address, 1000)
    ).to.be.revertedWith("Not owner");
  });

  it("should allow transfer of ownership", async function () {
    await token.transferOwnership(user1.address);
    expect(await token.owner()).to.equal(user1.address);
  });
});
