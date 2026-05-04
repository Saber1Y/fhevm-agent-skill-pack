import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", await deployer.getAddress());

  const Auction = await ethers.getContractFactory("SealedBidAuction");
  const auction = await Auction.deploy(60); // 60 minute bidding window
  await auction.waitForDeployment();

  console.log("SealedBidAuction deployed to:", await auction.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
