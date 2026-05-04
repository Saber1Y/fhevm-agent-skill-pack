import { ethers } from "hardhat";

const MAX_SUPPLY = 1_000_000n;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", await deployer.getAddress());

  const Token = await ethers.getContractFactory("ConfidentialToken");
  const token = await Token.deploy("Confidential Token", "CTKN", MAX_SUPPLY);
  await token.waitForDeployment();

  console.log("ConfidentialToken deployed to:", await token.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
