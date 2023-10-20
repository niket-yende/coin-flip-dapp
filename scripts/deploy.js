const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const PRIZE_AMOUNT_APT = 1000000000000;

  console.log("Deploying contracts with the account:", deployer.address);

  const aptosCoin = await ethers.deployContract("AptosCoin", ["AptosCoin", "APT", 1000000000000]);

  const aptosCoinAddress = await aptosCoin.getAddress();
  console.log("aptosCoin address:", aptosCoinAddress);

  const coinFlip = await ethers.deployContract("CoinFlip", [aptosCoinAddress]);
  const coinFlipAddress = await coinFlip.getAddress();
  console.log("coinFlip address:", coinFlipAddress);

  await aptosCoin.approveRequest(coinFlipAddress, PRIZE_AMOUNT_APT);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });