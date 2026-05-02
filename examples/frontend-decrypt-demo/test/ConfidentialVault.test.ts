import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "fhevmjs";
import type { ConfidentialVault } from "../typechain-types";
import type { FhevmCoinSigner } from "@fhevm/hardhat";

describe("ConfidentialVault", function () {
  let vault: ConfidentialVault;
  let fhevmInstance: any;
  let owner: FhevmCoinSigner;
  let user1: FhevmCoinSigner;
  let user2: FhevmCoinSigner;

  beforeEach(async function () {
    const Vault = await ethers.getContractFactory("ConfidentialVault");
    vault = (await Vault.deploy()) as ConfidentialVault;
    await vault.waitForDeployment();

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

  it("should deploy successfully", async function () {
    expect(await vault.getAddress()).to.properAddress;
  });

  it("should accept encrypted deposits", async function () {
    const deposit = fhevmInstance.encrypt32(1000);
    await vault
      .connect(user1)
      .deposit(deposit.handles[0], deposit.inputProof);

    const balance = await vault.connect(user1).getBalance();
    const decrypted = await user1.userDecryptEuint(balance);
    expect(decrypted).to.equal(1000n);
  });

  it("should accumulate multiple deposits", async function () {
    const deposit1 = fhevmInstance.encrypt32(500);
    await vault.connect(user1).deposit(deposit1.handles[0], deposit1.inputProof);

    const deposit2 = fhevmInstance.encrypt32(300);
    await vault.connect(user1).deposit(deposit2.handles[0], deposit2.inputProof);

    const balance = await vault.connect(user1).getBalance();
    const decrypted = await user1.userDecryptEuint(balance);
    expect(decrypted).to.equal(800n);
  });

  it("should allow confidential withdrawal", async function () {
    const deposit = fhevmInstance.encrypt32(1000);
    await vault.connect(user1).deposit(deposit.handles[0], deposit.inputProof);

    const withdraw = fhevmInstance.encrypt32(400);
    await vault
      .connect(user1)
      .withdraw(withdraw.handles[0], withdraw.inputProof);

    const balance = await vault.connect(user1).getBalance();
    const decrypted = await user1.userDecryptEuint(balance);
    expect(decrypted).to.equal(600n);
  });

  it("should transfer confidentially between users", async function () {
    const deposit = fhevmInstance.encrypt32(1000);
    await vault.connect(user1).deposit(deposit.handles[0], deposit.inputProof);

    const transfer = fhevmInstance.encrypt32(250);
    await vault
      .connect(user1)
      .transfer(user2.address, transfer.handles[0], transfer.inputProof);

    const balance1 = await vault.connect(user1).getBalance();
    const balance2 = await vault.connect(user2).getBalance();

    const decrypted1 = await user1.userDecryptEuint(balance1);
    const decrypted2 = await user2.userDecryptEuint(balance2);

    expect(decrypted1).to.equal(750n);
    expect(decrypted2).to.equal(250n);
  });

  it("should keep balances isolated between users", async function () {
    const deposit1 = fhevmInstance.encrypt32(1000);
    await vault.connect(user1).deposit(deposit1.handles[0], deposit1.inputProof);

    const deposit2 = fhevmInstance.encrypt32(2000);
    await vault.connect(user2).deposit(deposit2.handles[0], deposit2.inputProof);

    const balance1 = await vault.connect(user1).getBalance();
    const balance2 = await vault.connect(user2).getBalance();

    const decrypted1 = await user1.userDecryptEuint(balance1);
    const decrypted2 = await user2.userDecryptEuint(balance2);

    expect(decrypted1).to.equal(1000n);
    expect(decrypted2).to.equal(2000n);
  });

  it("should emit Deposited event", async function () {
    const deposit = fhevmInstance.encrypt32(100);
    await expect(
      vault.connect(user1).deposit(deposit.handles[0], deposit.inputProof)
    ).to.emit(vault, "Deposited");
  });

  it("should emit Withdrawn event", async function () {
    const deposit = fhevmInstance.encrypt32(500);
    await vault.connect(user1).deposit(deposit.handles[0], deposit.inputProof);

    const withdraw = fhevmInstance.encrypt32(100);
    await expect(
      vault.connect(user1).withdraw(withdraw.handles[0], withdraw.inputProof)
    ).to.emit(vault, "Withdrawn");
  });
});
