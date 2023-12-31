// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract AptosCoin is ERC20, ERC20Burnable {
    address public immutable owner;

    modifier onlyOwner {
        require(owner == msg.sender, "Only owner");
        _;
    }

    constructor(string memory name, string memory symbol, uint256 amount) ERC20(name, symbol) {
        owner = msg.sender;
        mint(msg.sender, amount);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function approveRequest(address spender, uint256 amount) public onlyOwner {
        _approve(owner, spender, amount);
    }
}