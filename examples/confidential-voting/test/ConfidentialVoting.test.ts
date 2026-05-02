import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "fhevmjs";
import type { ConfidentialVoting } from "../typechain-types";
import type { FhevmCoinSigner } from "@fhevm/hardhat";

describe("ConfidentialVoting", function () {
  let voting: ConfidentialVoting;
  let fhevmInstance: any;
  let owner: FhevmCoinSigner;
  let voter1: FhevmCoinSigner;
  let voter2: FhevmCoinSigner;
  let voter3: FhevmCoinSigner;
  const candidates = ["Alice", "Bob", "Charlie"];

  beforeEach(async function () {
    const Voting = await ethers.getContractFactory("ConfidentialVoting");
    voting = (await Voting.deploy(candidates)) as ConfidentialVoting;
    await voting.waitForDeployment();

    const signers = await ethers.getSigners();
    owner = signers[0] as FhevmCoinSigner;
    voter1 = signers[1] as FhevmCoinSigner;
    voter2 = signers[2] as FhevmCoinSigner;
    voter3 = signers[3] as FhevmCoinSigner;

    const network = await owner.provider.getNetwork();
    fhevmInstance = await createInstance({
      chainId: Number(network.chainId),
      publicKey: await owner.provider.call({
        to: "0x000000000000000000000000000000000000005d",
      }),
    });
  });

  it("should deploy with correct candidate count", async function () {
    expect(await voting.candidateCount()).to.equal(3n);
  });

  it("should return candidate names", async function () {
    expect(await voting.getCandidateName(0)).to.equal("Alice");
    expect(await voting.getCandidateName(1)).to.equal("Bob");
    expect(await voting.getCandidateName(2)).to.equal("Charlie");
  });

  it("should record encrypted votes", async function () {
    const vote = fhevmInstance.encrypt8(0);
    await voting
      .connect(voter1)
      .vote(vote.handles[0], vote.inputProof);

    expect(await voting.hasVoted(voter1.address)).to.equal(true);
  });

  it("should prevent double voting", async function () {
    const vote = fhevmInstance.encrypt8(0);
    await voting.connect(voter1).vote(vote.handles[0], vote.inputProof);

    await expect(
      voting.connect(voter1).vote(vote.handles[0], vote.inputProof)
    ).to.be.revertedWith("Already voted");
  });

  it("should reject votes for invalid candidate", async function () {
    const vote = fhevmInstance.encrypt8(5);
    await expect(
      voting.connect(voter1).vote(vote.handles[0], vote.inputProof)
    ).to.be.revertedWith("Invalid candidate");
  });

  it("should accumulate votes correctly", async function () {
    const voteAlice = fhevmInstance.encrypt8(0);
    await voting
      .connect(voter1)
      .vote(voteAlice.handles[0], voteAlice.inputProof);

    const voteAlice2 = fhevmInstance.encrypt8(0);
    await voting
      .connect(voter2)
      .vote(voteAlice2.handles[0], voteAlice2.inputProof);

    const voteBob = fhevmInstance.encrypt8(1);
    await voting
      .connect(voter3)
      .vote(voteBob.handles[0], voteBob.inputProof);

    const countAlice = await voting.getVoteCount(0);
    const countBob = await voting.getVoteCount(1);

    const decryptedAlice = await owner.userDecryptEuint(countAlice);
    const decryptedBob = await owner.userDecryptEuint(countBob);

    expect(decryptedAlice).to.equal(2n);
    expect(decryptedBob).to.equal(1n);
  });

  it("should stop voting after endVoting", async function () {
    await voting.endVoting();
    expect(await voting.votingEnded()).to.equal(true);

    const vote = fhevmInstance.encrypt8(0);
    await expect(
      voting.connect(voter1).vote(vote.handles[0], vote.inputProof)
    ).to.be.revertedWith("Voting has ended");
  });

  it("should return encrypted handles for vote counts", async function () {
    const count = await voting.getVoteCount(0);
    expect(typeof count).to.equal("bigint");
  });
});
