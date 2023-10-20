// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract CoinFlip is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Define the Game struct to represent a single game
    struct Game {
        uint256 gameId;
        address playerAddress;
        uint8[] predictedFlips;
        uint8[] flipsResult;
        bool isPresent;
    }

    struct State {
        uint256 nextGameId;
        mapping(uint256 => Game) games;
        bool prizeClaimed;
    }

    Game[] public gameList;
    uint8 constant HEAD = 0;
    uint8 constant TAIL = 1;
    State public state;
    IERC20 public immutable aptosCoin;
    uint8 private constant NUMBER_OF_FLIPS = 10;
    uint64 private constant PRIZE_AMOUNT_APT = 1000000000; // 10 APT
    
    // Error codes
    string private constant EInsufficientAptBalance = "0";
    string private constant ESignerIsNotOvermind = "1";
    string private constant EPrizeHasAlreadyBeenClaimed = "2";
    string private constant EGameDoesNotExist = "3";
    string private constant EInvalidNumberOfFlips = "4";
    string private constant EInvalidFlipValue = "5";
    string private constant EOvermindHasAlreadySubmittedTheFlips = "6";
    string private constant EOvermindHasNotSubmittedTheFlipsYet = "7";

    event GuessFlips(uint256 _gameId, uint8[] _flips, uint _timestamp);
    event ProvideFlipsResult(uint256 _gameId, uint8[] _flipsResult, uint _timestamp);
    event ClaimPrize(uint256 _gameId, address _player, uint _timestamp);

    modifier checkIfFlipsAreValid(uint8[] memory _flips) {
        require(_flips.length == NUMBER_OF_FLIPS, EInvalidNumberOfFlips);

        // Iterate over `flips` and ensure that each element equals either `HEAD` or `TAIL`
        // If an element is not either of those, revert with error code: EInvalidFlipValue
        for (uint256 i = 0; i < _flips.length; i++) {
            require(_flips[i] == HEAD || _flips[i] == TAIL, EInvalidFlipValue);
        }
        _;
    }

    modifier prizeAmountClaimed {
        require(!state.prizeClaimed, EPrizeHasAlreadyBeenClaimed);
        _;
    }

    modifier isOvermindOwner {
        require(msg.sender == owner(), ESignerIsNotOvermind);
        _;
    }

    // Initialize the contract with the AptosCoin token address
    constructor(address _aptosCoin) {
        aptosCoin = IERC20(_aptosCoin);
    }

    // Only owner can invoke this init method
    function init() public onlyOwner() {
        // check if the owner has enough apt coins to start a new game
        require(getTokenBalance(msg.sender) >= PRIZE_AMOUNT_APT, EInsufficientAptBalance);

        // Initialize the state object
        state.nextGameId = 0;
        state.prizeClaimed = false;

        // Reset games
        delete gameList;
    }

    // Function to allow the owner to claim the remaining APT balance
    function claimRemainingBalance() external onlyOwner {
        uint256 balance = aptosCoin.balanceOf(address(this));
        aptosCoin.safeTransfer(owner(), balance);
    }

    // Function to create a new game and allow players to guess the flips
    // Check if the provided flips are valid
    function guessFlips(uint8[] memory _flips) external checkIfFlipsAreValid(_flips) prizeAmountClaimed {
        uint256 _gameId = getNextGameId(state.nextGameId);
        Game memory game = Game(_gameId, msg.sender, _flips, new uint8[](0), true);
        state.games[_gameId] = game;
        gameList.push(game);

        emit GuessFlips(_gameId, _flips, block.timestamp);
    }

    // Function for the owner to provide the flip results and distribute prizes
    function provideFlipsResult(uint256 _gameId, uint8[] memory _flipsResult) external isOvermindOwner checkIfFlipsAreValid(_flipsResult) prizeAmountClaimed {
        // Check if the game exists
        Game storage game = state.games[_gameId];
        require(game.isPresent, EGameDoesNotExist);

        require(checkIfOvermindHasNotSubmittedFlipsYet(game), EOvermindHasAlreadySubmittedTheFlips);

        game.flipsResult = _flipsResult;

        emit ProvideFlipsResult(_gameId, _flipsResult, block.timestamp);

        if (compareArrays(game.predictedFlips, _flipsResult)) {
            state.prizeClaimed = true;
            emit ClaimPrize(_gameId, game.playerAddress, block.timestamp);
            aptosCoin.safeTransferFrom(msg.sender, game.playerAddress, PRIZE_AMOUNT_APT); // 10 APT prize
        }
    }

    // Function to compare two arrays of uint8
    function compareArrays(uint8[] memory _arr1, uint8[] memory _arr2)
        public
        pure
        returns (bool)
    {

        if (keccak256(abi.encode(_arr1)) == keccak256(abi.encode(_arr2)))  {
            return true;
        }

        return false;
    }

    // Returns all the games
    function getAllGames() public view returns (Game[] memory) {
        return gameList;
    }

    function getGameById(uint256 _gameId) public view returns (Game memory) {
        return state.games[_gameId];
    }

    function getGameResult(uint256 _gameId) public view returns (bool) {
        // Check if the game exists
        mapping(uint256 => Game) storage games = state.games;
        Game memory game = games[_gameId];
        require(game.isPresent, EGameDoesNotExist);
        require(checkIfOvermindHasAlreadySubmittedTheFlips(game), EOvermindHasNotSubmittedTheFlipsYet);

        return compareArrays(game.predictedFlips, game.flipsResult);       
    }

    function getResourceAccountAddress() public view returns (address) {
        return owner();
    }

    function getTokenBalance(address _accountAddress) public view returns (uint256) {
        return aptosCoin.balanceOf(_accountAddress);
    }

    function getNextGameId(uint256 _nextGameId) public returns (uint256) {
        uint256 gameId = _nextGameId;
        state.nextGameId = gameId + 1;
        return gameId;
    }

    function checkIfOvermindHasNotSubmittedFlipsYet(Game memory _game) internal pure returns (bool) {
        if(_game.flipsResult.length == 0) {
            return true;
        }
        return false;
    }

    function checkIfOvermindHasAlreadySubmittedTheFlips(Game memory _game) internal pure returns (bool) {
        if(_game.flipsResult.length > 0) {
            return true;
        }
        return false;
    }

    // only used for testing
    function claimPrizeUnchecked() public onlyOwner {
        state.prizeClaimed = true;
    }

    // only used for testing
    function unclaimPrizeUnchecked() public onlyOwner {
        state.prizeClaimed = false;
    }   
}

