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
    const [addr1, addr2] = await ethers.getSigners();

    const aptosCoin = await ethers.deployContract("AptosCoin", ["AptosCoin", "APT", 1000000000000]);
    const aptosCoinAddress = await aptosCoin.getAddress();
    const coinFlip = await ethers.deployContract("CoinFlip", [aptosCoinAddress]);
    
    // Fixtures can return anything you consider useful for your tests
    return { aptosCoin, coinFlip, addr1, addr2 };
  }

  // it("Should assign the total supply of tokens to the owner", async function () {
  //   const { hardhatToken, owner } = await loadFixture(deployTokenFixture);

  //   const ownerBalance = await hardhatToken.balanceOf(owner.address);
  //   expect(await hardhatToken.totalSupply()).to.equal(ownerBalance);
  // });

  it("Should test init module", async function () {
    const { coinFlip, addr1, addr2 } = await loadFixture(
      deployCoinFlipFixture
    );

    await coinFlip.init();

    const state = await coinFlip.state();
    const allGames = await coinFlip.getAllGames();

    expect(state.nextGameId).to.equal(0);
    expect(allGames.length).to.equal(0);
    expect(state.prizeClaimed).to.equal(false);
  });

  it("Should test guess flips", async function () {
    const { coinFlip, addr1, addr2 } = await loadFixture(
      deployCoinFlipFixture
    );

    await coinFlip.init();

    const flips = [0, 0, 0, 0, 0, 0, 0, 1, 1, 0];
    const player = addr1.address;

    await coinFlip.guessFlips(flips, {from: player});

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

    expect(playerAddress).to.equal(player);
    expect(predictedFlips).to.equal(stringifiedFlips);
    expect(flipsResult).to.be.empty;
  });
});