import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", await deployer.getAddress());

  const candidates = ["Alice", "Bob", "Charlie"];

  const Voting = await ethers.getContractFactory("ConfidentialVoting");
  const voting = await Voting.deploy(candidates);
  await voting.waitForDeployment();

  console.log("ConfidentialVoting deployed to:", await voting.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
