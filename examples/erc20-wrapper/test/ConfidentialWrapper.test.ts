import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "fhevmjs";
import type { ConfidentialWrapper, MockERC20 } from "../typechain-types";
import type { FhevmCoinSigner } from "@fhevm/hardhat";

describe("ConfidentialWrapper", function () {
  let wrapper: ConfidentialWrapper;
  let mockToken: MockERC20;
  let fhevmInstance: any;
  let owner: FhevmCoinSigner;
  let user1: FhevmCoinSigner;
  let user2: FhevmCoinSigner;

  beforeEach(async function () {
    const MockToken = await ethers.getContractFactory(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20"
    );
    mockToken = (await MockToken.deploy("Mock Token", "MTK")) as MockERC20;
    await mockToken.waitForDeployment();

    const Wrapper = await ethers.getContractFactory("ConfidentialWrapper");
    wrapper = (await Wrapper.deploy(
      "Wrapped Confidential",
      "wCTKN",
      await mockToken.getAddress()
    )) as ConfidentialWrapper;
    await wrapper.waitForDeployment();

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

    // Mint mock tokens to users
    await mockToken.mint(user1.address, ethers.parseEther("10000"));
    await mockToken.mint(user2.address, ethers.parseEther("10000"));
  });

  it("should deploy with correct wrapped token address", async function () {
    expect(await wrapper.wrappedToken()).to.equal(await mockToken.getAddress());
  });

  it("should wrap ERC-20 to confidential tokens", async function () {
    const amount = ethers.parseEther("100");
    await mockToken
      .connect(user1)
      .approve(await wrapper.getAddress(), amount);

    await wrapper.connect(user1).wrap(amount);

    const wrappedBalance = await wrapper.getWrappedBalance(user1.address);
    expect(typeof wrappedBalance).to.equal("bigint");
  });

  it("should deduct ERC-20 from user on wrap", async function () {
    const amount = ethers.parseEther("500");
    await mockToken
      .connect(user1)
      .approve(await wrapper.getAddress(), amount);

    const balanceBefore = await mockToken.balanceOf(user1.address);
    await wrapper.connect(user1).wrap(amount);
    const balanceAfter = await mockToken.balanceOf(user1.address);

    expect(balanceAfter).to.equal(balanceBefore - amount);
  });

  it("should hold ERC-20 in wrapper contract", async function () {
    const amount = ethers.parseEther("100");
    await mockToken
      .connect(user1)
      .approve(await wrapper.getAddress(), amount);
    await wrapper.connect(user1).wrap(amount);

    const wrapperBalance = await wrapper.getWrappedTokenBalance();
    expect(wrapperBalance).to.equal(amount);
  });

  it("should unwrap back to ERC-20", async function () {
    const amount = ethers.parseEther("100");
    await mockToken
      .connect(user1)
      .approve(await wrapper.getAddress(), amount);
    await wrapper.connect(user1).wrap(amount);

    await wrapper.connect(user1).unwrap(amount);

    const userBalance = await mockToken.balanceOf(user1.address);
    expect(userBalance).to.equal(ethers.parseEther("10000"));
  });

  it("should transfer confidentially between users", async function () {
    const wrapAmount = ethers.parseEther("1000");
    await mockToken
      .connect(user1)
      .approve(await wrapper.getAddress(), wrapAmount);
    await wrapper.connect(user1).wrap(wrapAmount);

    const transferAmount = fhevmInstance.encrypt256(ethers.parseEther("250"));
    await wrapper
      .connect(user1)
      .transfer(user2.address, transferAmount.handles[0], transferAmount.inputProof);

    const balance1 = await wrapper.getWrappedBalance(user1.address);
    const balance2 = await wrapper.getWrappedBalance(user2.address);

    const decrypted1 = await user1.userDecryptEuint(balance1);
    const decrypted2 = await user2.userDecryptEuint(balance2);

    expect(decrypted1).to.equal(ethers.parseEther("750"));
    expect(decrypted2).to.equal(ethers.parseEther("250"));
  });

  it("should emit Wrapped event", async function () {
    const amount = ethers.parseEther("100");
    await mockToken
      .connect(user1)
      .approve(await wrapper.getAddress(), amount);

    await expect(wrapper.connect(user1).wrap(amount))
      .to.emit(wrapper, "Wrapped")
      .withArgs(user1.address, amount);
  });

  it("should emit Unwrapped event", async function () {
    const amount = ethers.parseEther("100");
    await mockToken
      .connect(user1)
      .approve(await wrapper.getAddress(), amount);
    await wrapper.connect(user1).wrap(amount);

    await expect(wrapper.connect(user1).unwrap(amount))
      .to.emit(wrapper, "Unwrapped")
      .withArgs(user1.address, amount);
  });
});
