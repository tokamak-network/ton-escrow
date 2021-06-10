import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
const { expect } = require("chai");
import { Contract, ContractFactory, utils } from 'ethers'

task("Escrow", "Test 1", async (args, hre) => {
  let ton: Contract
  before(async () => {
    const erc20Factory = await hre.ethers.getContractFactory("mockERC20");
    ton = await erc20Factory.deploy();
  })

  it("Test 1", async () => {
    const accounts = await hre.ethers.getSigners();
    const balance1 = await ton.balanceOf(accounts[0].address)
    expect(balance1).to.equal(0)
  });
});

export default {
  solidity: "0.8.0",
};
