const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("CoinFip", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployCoinFlipFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const PRIZE_AMOUNT_APT = 1000000000;

    // 1000000000000
    const aptosCoin = await ethers.deployContract("AptosCoin", ["AptosCoin", "APT", PRIZE_AMOUNT_APT]);
    const aptosCoinAddress = await aptosCoin.getAddress();
    console.log('owner:', await aptosCoin.owner());

    const coinFlip = await ethers.deployContract("CoinFlip", [aptosCoinAddress]);
    console.log(await coinFlip.getResourceAccountAddress());
    
    // Fixtures can return anything you consider useful for your tests
    return { aptosCoin, coinFlip, addr1, addr2, PRIZE_AMOUNT_APT, owner };
  }

  // it("Should assign the total supply of tokens to the owner", async function () {
  //   const { hardhatToken, owner } = await loadFixture(deployTokenFixture);

  //   const ownerBalance = await hardhatToken.balanceOf(owner.address);
  //   expect(await hardhatToken.totalSupply()).to.equal(ownerBalance);
  // });

  it("Should test init module", async function () {
    const { coinFlip } = await loadFixture(
      deployCoinFlipFixture
    );

    await coinFlip.init();

    const state = await coinFlip.state();
    const allGames = await coinFlip.getAllGames();

    expect(state.nextGameId).to.equal(0);
    expect(allGames.length).to.equal(0);
    expect(state.prizeClaimed).to.equal(false);
  });

  it("Should test init module insufficient apt balance", async function () {
    const aptosCoin = await ethers.deployContract("AptosCoin", ["AptosCoin", "APT", 10000]);
    const aptosCoinAddress = await aptosCoin.getAddress();
    const coinFlip = await ethers.deployContract("CoinFlip", [aptosCoinAddress]);

    // EInsufficientAptBalance = "0"
    await expect(coinFlip.init()).to.be.revertedWith('0');
  });

  it("Should test guess flips", async function () {
    const { coinFlip, addr1 } = await loadFixture(
      deployCoinFlipFixture
    );

    await coinFlip.init();

    const flips = [0, 0, 0, 0, 0, 0, 0, 1, 1, 0];
    const player = addr1;

    // await hardhatToken.connect(addr1).transfer(addr2.address, 50);
    await coinFlip.connect(player).guessFlips(flips);

    const state = await coinFlip.state();
    const allGames = await coinFlip.getAllGames();

    expect(state.nextGameId).to.equal(1);
    expect(allGames.length).to.equal(1);
    expect(state.prizeClaimed).to.equal(false);

    const game = await coinFlip.getGameById(0);

    const playerAddress = game[1];
    const predictedFlips = JSON.stringify(game[2].map(value => Number(value)));
    const stringifiedFlips = JSON.stringify(flips);
    const flipsResult = game[3]; 

    expect(playerAddress).to.equal(player.address);
    expect(predictedFlips).to.equal(stringifiedFlips);
    expect(flipsResult).to.be.empty;
  });

  it("Should test guess flips prize has already been claimed", async function () {
    const { coinFlip, addr1 } = await loadFixture(
      deployCoinFlipFixture
    );

    await coinFlip.init();

    // Manually updating the claimedPrize flag to true
    await coinFlip.claimPrizeUnchecked();

    const flips = [0, 0, 0, 0, 0, 0, 0, 1, 1, 0];
    const player = addr1;

    // EPrizeHasAlreadyBeenClaimed = "2"
    await expect(coinFlip.connect(player).guessFlips(flips)).to.be.revertedWith('2');

    // Reset claimedPrize flag to false
    await coinFlip.unclaimPrizeUnchecked();
  });

  it("Should test guess flips with invalid number of flips", async function () {
    const { coinFlip, addr1 } = await loadFixture(
      deployCoinFlipFixture
    );

    await coinFlip.init();

    const flips = [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1];
    const player = addr1;

    // EInvalidNumberOfFlips = "4"
    await expect(coinFlip.connect(player).guessFlips(flips)).to.be.revertedWith('4');
  });

  it("Should test guess flips with invalid flip value", async function () {
    const { coinFlip, addr1 } = await loadFixture(
      deployCoinFlipFixture
    );

    await coinFlip.init();

    const flips = [0, 0, 0, 0, 2, 0, 0, 1, 1, 0];
    const player = addr1;

    // EInvalidFlipValue = "5"
    await expect(coinFlip.connect(player).guessFlips(flips)).to.be.revertedWith('5');
  });

  // it("Should test provide flip results", async function () {
  //   const { coinFlip, addr1, PRIZE_AMOUNT_APT } = await loadFixture(
  //     deployCoinFlipFixture
  //   );

  //   await coinFlip.init();

  //   const flips = [0, 0, 0, 0, 0, 0, 0, 1, 1, 0];
  //   const player = addr1;

  //   await coinFlip.connect(player).guessFlips(flips);

  //   const flipsResult = [0, 0, 1, 1, 0, 1, 0, 0, 1, 1];

  //   await coinFlip.provideFlipsResult(0, flipsResult);

  //   const state = await coinFlip.state();
  //   const allGames = await coinFlip.getAllGames();

  //   expect(state.nextGameId).to.equal(1);
  //   expect(allGames.length).to.equal(1);
  //   // expect(state.prizeClaimed).to.equal(true); // Need to check why its not setting to true
 
  //   const playerBalance = await coinFlip.getTokenBalance(player.address);
  //   console.log(playerBalance);  
  //   console.log(await coinFlip.getResourceAccountAddress());
    
  //   expect(playerBalance).to.equal(PRIZE_AMOUNT_APT);    

  //   const game = await coinFlip.getGameById(0);

  //   const playerAddress = game[1];
  //   const predictedFlips = JSON.stringify(game[2].map(value => Number(value)));
  //   const stringifiedFlips = JSON.stringify(flips);
  //   const result = JSON.stringify(game[3].map(value => Number(value)));; 
  //   const stringifiedFlipsResult = JSON.stringify(flipsResult);

  //   expect(playerAddress).to.equal(player);
  //   expect(predictedFlips).to.equal(stringifiedFlips);
  //   expect(result).to.equal(stringifiedFlipsResult);
  // });
});
