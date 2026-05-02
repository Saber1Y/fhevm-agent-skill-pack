import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "fhevmjs";
import type { SealedBidAuction } from "../typechain-types";
import type { FhevmCoinSigner } from "@fhevm/hardhat";

describe("SealedBidAuction", function () {
  let auction: SealedBidAuction;
  let fhevmInstance: any;
  let seller: FhevmCoinSigner;
  let bidder1: FhevmCoinSigner;
  let bidder2: FhevmCoinSigner;
  let bidder3: FhevmCoinSigner;

  beforeEach(async function () {
    const Auction = await ethers.getContractFactory("SealedBidAuction");
    auction = (await Auction.deploy(60)) as SealedBidAuction;
    await auction.waitForDeployment();

    const signers = await ethers.getSigners();
    seller = signers[0] as FhevmCoinSigner;
    bidder1 = signers[1] as FhevmCoinSigner;
    bidder2 = signers[2] as FhevmCoinSigner;
    bidder3 = signers[3] as FhevmCoinSigner;

    const network = await seller.provider.getNetwork();
    fhevmInstance = await createInstance({
      chainId: Number(network.chainId),
      publicKey: await seller.provider.call({
        to: "0x000000000000000000000000000000000000005d",
      }),
    });
  });

  it("should deploy with correct seller and end time", async function () {
    expect(await auction.seller()).to.equal(seller.address);
    expect(await auction.finalized()).to.equal(false);
  });

  it("should accept encrypted bids", async function () {
    const bid = fhevmInstance.encrypt64(BigInt("1000"));
    await auction
      .connect(bidder1)
      .placeBid(bid.handles[0], bid.inputProof);

    expect((await auction.bidders(bidder1.address)).hasBid).to.equal(true);
  });

  it("should prevent double bidding", async function () {
    const bid = fhevmInstance.encrypt64(BigInt("1000"));
    await auction.connect(bidder1).placeBid(bid.handles[0], bid.inputProof);

    await expect(
      auction.connect(bidder1).placeBid(bid.handles[0], bid.inputProof)
    ).to.be.revertedWith("Already placed bid");
  });

  it("should accept multiple different bidders", async function () {
    const bid1 = fhevmInstance.encrypt64(BigInt("1000"));
    await auction
      .connect(bidder1)
      .placeBid(bid1.handles[0], bid1.inputProof);

    const bid2 = fhevmInstance.encrypt64(BigInt("2000"));
    await auction
      .connect(bidder2)
      .placeBid(bid2.handles[0], bid2.inputProof);

    expect(await auction.getBidderCount()).to.equal(2n);
  });

  it("should allow bidders to retrieve their own bid", async function () {
    const bid = fhevmInstance.encrypt64(BigInt("1500"));
    await auction
      .connect(bidder1)
      .placeBid(bid.handles[0], bid.inputProof);

    const myBid = await auction.connect(bidder1).getMyBid();
    const decrypted = await bidder1.userDecryptEuint(myBid);
    expect(decrypted).to.equal(1500n);
  });

  it("should finalize after bidding ends", async function () {
    await auction.finalize();
    expect(await auction.finalized()).to.equal(true);
  });

  it("should allow retrieving highest bid after finalization", async function () {
    const bid = fhevmInstance.encrypt64(BigInt("5000"));
    await auction
      .connect(bidder1)
      .placeBid(bid.handles[0], bid.inputProof);

    await auction.finalize();

    const highest = await auction.getHighestBid();
    const decrypted = await seller.userDecryptEuint(highest);
    expect(decrypted).to.equal(5000n);
  });
});
