const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const aptosCoin = await ethers.deployContract("AptosCoin", ["AptosCoin", "APT", 1000000000000]);

  const aptosCoinAddress = await aptosCoin.getAddress();
  console.log("aptosCoin address:", aptosCoinAddress);

  const coinFlip = await ethers.deployContract("CoinFlip", [aptosCoinAddress]);
  console.log("coinFlip address:", await coinFlip.getAddress());

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });