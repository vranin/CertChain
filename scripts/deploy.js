// scripts/deploy.js
// Deploys CertificateRegistry and writes address + ABI to config/contract.json
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Factory = await ethers.getContractFactory("CertificateRegistry");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("CertificateRegistry deployed to:", address);

  // Write address + ABI so the backend can read them without hardcoding
  const artifact = await hre.artifacts.readArtifact("CertificateRegistry");
  const configDir = path.join(__dirname, "..", "config");
  fs.mkdirSync(configDir, { recursive: true });

  fs.writeFileSync(
    path.join(configDir, "contract.json"),
    JSON.stringify({ address, abi: artifact.abi }, null, 2)
  );
  console.log("Contract config written to config/contract.json");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
