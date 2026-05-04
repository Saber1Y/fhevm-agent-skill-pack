import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", await deployer.getAddress());

  const Vault = await ethers.getContractFactory("ConfidentialVault");
  const vault = await Vault.deploy();
  await vault.waitForDeployment();

  console.log("ConfidentialVault deployed to:", await vault.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
