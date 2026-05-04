import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", await deployer.getAddress());

  // First deploy a mock ERC20
  const MockToken = await ethers.getContractFactory("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20");
  const mockToken = await MockToken.deploy("Mock Token", "MTK");
  await mockToken.waitForDeployment();
  console.log("MockToken deployed to:", await mockToken.getAddress());

  // Then deploy the wrapper
  const Wrapper = await ethers.getContractFactory("ConfidentialWrapper");
  const wrapper = await Wrapper.deploy(
    "Wrapped Confidential",
    "wCTKN",
    await mockToken.getAddress()
  );
  await wrapper.waitForDeployment();

  console.log("ConfidentialWrapper deployed to:", await wrapper.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
