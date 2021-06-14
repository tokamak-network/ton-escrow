import { isAddress } from "@ethersproject/address"
const { AddressZero } = require("@ethersproject/constants");
const { ethers, network } = require('hardhat')
const chai = require('chai')
const { solidity } = require('ethereum-waffle')
const { expect } = chai

chai.use(solidity)

describe("Token deploy", () => {
  const TOKEN_NAME = 'PCI_ERC20'
  const TOKEN_SYMBOL = 'PCI'
  const TOKEN_INITIAL_SUPPLY = 100000
  const TON_NAME = 'Tokamak'
  const TON_SYMBOL = 'TON'
  const TON_INITIAL_SUPPLY = 100000
  
  let tonOwner: any
  let escrowOwner: any
  let account1: any
  let account2: any
  let account3: any
  let account4: any
  
  let ton: any
  let ERC20 : any
  let escrow : any
  let prov : any

  before(async () => {
    [ tonOwner, escrowOwner, account1, account2, account3, account4 ] = await ethers.getSigners();
    const erc20Factory = await ethers.getContractFactory("mockERC20");
    prov = ethers.getDefaultProvider();
    //ton deploy
    ton = await erc20Factory.deploy(
      TON_NAME,
      TON_SYMBOL,
      TON_INITIAL_SUPPLY
    );
    // console.log("ton : ", ton.address)
      
    //ERC20 deploy
    const erc20_Factoey = await ethers.getContractFactory('mockERC20');
    ERC20 = await erc20_Factoey.connect(account1).deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      TOKEN_INITIAL_SUPPLY
    );
    // console.log("ERC20 : ", ERC20.address)

    //tonEscrow deploy
    const tonEscrow = await ethers.getContractFactory("TONEscrow")
    escrow = await tonEscrow.connect(escrowOwner).deploy(
      ton.address
    )
    // console.log("escrow : ", escrow.address)
  })

  // it("Test 1", async () => {
  //   const accounts = await ethers.getSigners();
  //   const balance1 = await ton.balanceOf(accounts[0].address)
  //   expect(balance1).to.equal(0)
  // });

  it("TON name", async () => {
    const tokenName = await ton.name()
    expect(tokenName).to.equal(TON_NAME)
  });

  it("TON symbol", async () => {
    const tokenSymbol= await ton.symbol()
    expect(tokenSymbol).to.equal(TON_SYMBOL)
  });

  it("TON is totalSupply = TON_INITIAL_SUPPLY ", async () => {
    const tokenSupply = await ton.totalSupply()
    // console.log(tokenSupply.toNumber())
    expect(tokenSupply).to.equal(TON_INITIAL_SUPPLY)
  });

  //tonOwner는 TON을 가지고 있습니다.
  it("tonOwner have a TON tonOwner.balance = TON_INITIAL_SUPPLY ", async () => {
    const balance1 = await ton.balanceOf(tonOwner.address)
    // console.log("tonOwner TON balance :", balance1.toNumber())
    expect(balance1).to.equal(TON_INITIAL_SUPPLY)
  });

  //account1은 TON이 없습니다.
  it("account1 have a TON account1.balance = 0", async () => {
    const balance1 = await ton.balanceOf(account1.address)
    // console.log(balance1.toNumber())
    expect(balance1).to.equal(0)
  });

  //tonOwer가 account1에 500TON을 전송합니다.
  // it("TON tonOwner transfer to account1", async () => {
  //   const tx = await ton.connect(tonOwner).transfer(
  //     account1.address,
  //     500
  //   )
  //   await tx.wait()

  //   const balance1 = await ton.balanceOf(tonOwner.address)
  //   const balance2 = await ton.balanceOf(account1.address)
  //   // console.log(balance.toNumber())
  //   expect(balance1).to.equal(TON_INITIAL_SUPPLY-500)
  //   expect(balance2).to.equal(500)
  // });

  //tonOwner가 escrowCA에 500TON을 전송합니다.
  it("tonOwner transfer to escrow CA", async () => {
    const tx = await ton.connect(tonOwner).transfer(
      escrow.address,
      500
    )
    await tx.wait()

    const balance1 = await ton.balanceOf(tonOwner.address)
    const balance2 = await ton.balanceOf(escrow.address)
    // console.log(balance.toNumber())
    expect(balance1).to.equal(TON_INITIAL_SUPPLY-500)
    expect(balance2).to.equal(500)
  });

  //TONEscrow가 500TON을 가지고 있는지 확인합니다.
  it("TONEscrow.address have 500TON", async () => {
    const balance1 = await ton.balanceOf(escrow.address)
    expect(balance1).to.equal(500)
  });

  //TONEscrow의 owner는 escrowOwner입니다.
  it("TONEscrow.owner is escrowOwner", async () => {
    const owner = await escrow.owner()
    expect(owner).to.equal(escrowOwner.address)
  });

  //TONEscrow의 owner는 account1이 아닙니다.
  it("TONEscrow.owner is not account1", async () => {
    const owner = await escrow.owner()
    expect(owner).to.not.equal(account1.address)
  });
  
  //escrowOwner가 account1이 ERC20을 150만큼 입금하면 50만큼 ton을 받을 수 있는 addDeal을 만듭니다.
  it("TONEscrow.owner can addDeal", async () => {
    const tx = await escrow.connect(escrowOwner).addDeal(
      account1.address,
      50,
      ERC20.address,
      150
    )
    const dealResult = await escrow.connect(escrowOwner).deals(account1.address)
    // console.log(await dealResult.tonAmount.toNumber())
    // console.log(await dealResult.payTokenAmount.toNumber())
    // console.log(await dealResult.payToken)
    await expect(dealResult.tonAmount.toNumber()).to.equal(50)
    await expect(dealResult.payTokenAmount.toNumber()).to.equal(150)
    await expect(dealResult.payToken).to.equal(ERC20.address)
  });

  //owner가 아니면 addDeal을 할 수 없습니다.
  it("not owner can't addDeal", async () => {
    const dealResult = escrow.connect(account2).addDeal(
      account1.address,
      50,
      ERC20.address,
      150
    )
    await expect(dealResult).to.be.revertedWith("Ownable: caller is not the owner")
  });

  //owner가 아니면 delDeal을 할 수 없습니다.
  it("not owner can't delDeal", async () => {
    const dealResult = escrow.connect(account2).delDeal(
      account1.address
    )
    await expect(dealResult).to.be.revertedWith("Ownable: caller is not the owner")
  });

  //escrowOwner은 delDeal을 할 수 있습니다.
  it("escrowOwner can delDeal", async () => {
    const tx = escrow.connect(escrowOwner).delDeal(
      account1.address
    )
    const dealResult = await escrow.connect(escrowOwner).deals(account1.address)
    // console.log(await dealResult)
    await expect(dealResult.tonAmount.toNumber()).to.equal(0)
    await expect(dealResult.payTokenAmount.toNumber()).to.equal(0)
    await expect(dealResult.payToken).to.equal(AddressZero)
  });


  //account1이 ERC20을 가지고 있습니다.
  it("account1 have the ERC20", async () => {
    const balance1 = await ERC20.balanceOf(account1.address)
    // console.log("account1 ERC20 balance : ", balance1.toNumber())
    expect(balance1).to.equal(TOKEN_INITIAL_SUPPLY)
  });

  //approve && addDeal 안되어 있을 때 구매
  it("account1 can't buy the Ton before approve && addDeal", async () => {
    const buyResult = escrow.connect(account1).buy(
      ERC20.address,
      150
    )
    await expect(buyResult).to.be.revertedWith("wrong token")
  });

  //addDeal은 되어있고 approve는 안되어 있을 때 구매
  it("account1 can't buy the Ton before approve", async () => {
    const tx = await escrow.connect(escrowOwner).addDeal(
      account1.address,
      50,
      ERC20.address,
      150
    )
    const dealResult = await escrow.connect(escrowOwner).deals(account1.address)
    await expect(dealResult.tonAmount.toNumber()).to.equal(50)
    await expect(dealResult.payTokenAmount.toNumber()).to.equal(150)
    await expect(dealResult.payToken).to.equal(ERC20.address)

    const buyResult = escrow.connect(account1).buy(
      ERC20.address,
      150
    )
    await expect(buyResult).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
  });

  //addDeal은 안되어있고 approve만 되어있을 때 구매
  it("account1 can't buy the Ton before addDeal", async () => {
    const tx = await ERC20.connect(account1).approve(
      escrow.address,
      150
    )

    const tx2 = escrow.connect(escrowOwner).delDeal(
      account1.address
    )
    const dealResult = await escrow.connect(escrowOwner).deals(account1.address)
    await expect(dealResult.tonAmount.toNumber()).to.equal(0)
    await expect(dealResult.payTokenAmount.toNumber()).to.equal(0)
    await expect(dealResult.payToken).to.equal(AddressZero)

    const buyResult = escrow.connect(account1).buy(
      ERC20.address,
      150
    )
    await expect(buyResult).to.be.revertedWith("wrong token")
  });

  //addDeal과 approve 둘다 되어있을때 구매 (addDeal에서의 입력이 맞아야한다.)
  it("account1 can buy after addDeal and approve ", async () => {
    const tx = await escrow.connect(escrowOwner).addDeal(
      account1.address,
      50,
      ERC20.address,
      150
    )
    const dealResult = await escrow.connect(escrowOwner).deals(account1.address)
    await expect(dealResult.tonAmount.toNumber()).to.equal(50)
    await expect(dealResult.payTokenAmount.toNumber()).to.equal(150)
    await expect(dealResult.payToken).to.equal(ERC20.address)

    const tx2 = await ERC20.connect(account1).approve(
      escrow.address,
      150
    )

    const buyTx = await escrow.connect(account1).buy(
      ERC20.address,
      150
    )

    await expect((await ton.balanceOf(escrow.address)).toNumber()).to.equal(450)
    await expect((await ERC20.balanceOf(escrowOwner.address)).toNumber()).to.equal(150)
    await expect((await ton.balanceOf(account1.address)).toNumber()).to.equal(50)
  });

  //approve후 allownance 확인(account2 approve 100)
  // it("account2 approve the escrow CA and check the allowance", async () => {
  //   const tx = await ERC20.connect(account2).approve(
  //     escrow.address,
  //     100
  //   )

  //   const tx2 = await ERC20.allowance(
  //     account2.address, 
  //     escrow.address
  //   )

  //   await expect(tx2.toNumber()).to.equal(100)
  // });

  //addDeal와 approve했을 때 buy함수 호출 시 가격이 틀리면 살 수 없습니다.
  it("should enter addDeal and buy exactly amount.", async () => {
    const dealResult = escrow.connect(escrowOwner).addDeal(
      account2.address,
      50,
      ERC20.address,
      150
    )

    const tx = await ERC20.connect(account2).approve(
      escrow.address,
      100
    )

    const tx2 = escrow.connect(account2).buy(
      ERC20.address,
      100
    )

    await expect(tx2).to.be.revertedWith("wrong amount")
  });

  //addDeal와 approve했을 때 buy함수 호출 시 입금주소가 틀리면 살 수 없습니다.
  it("should enter addDeal and buy exactly tokenAddress.", async () => {
    const dealResult = escrow.connect(escrowOwner).addDeal(
      account2.address,
      50,
      ERC20.address,
      150
    )

    const tx = await ERC20.connect(account2).approve(
      escrow.address,
      150
    )

    const tx2 = escrow.connect(account2).buy(
      ton.address,
      150
    )

    await expect(tx2).to.be.revertedWith("wrong token")
  });
  
  // approve를 넘는 수량을 살 수 없습니다.
  it("account1 can buy the Ton through TONEscrow", async () => {
    const tx = await ERC20.connect(account2).approve(
      escrow.address,
      100
    ) 
    const tx2 = escrow.connect(account2).buy(
      ERC20.address,
      150
    )
    await expect(tx2).to.be.revertedWith("ERC20: transfer amount exceeds balance")
  });

  //ETH기준으로 addDeal생성 후 buy함수 호출 시
  it("owner can addDeal and account4 call the buy", async () => {
    const dealResult = await escrow.connect(escrowOwner).addDeal(
      account4.address,
      50,
      AddressZero,
      15000000000
    )
    const tx2 = escrow.connect(account4).buy(
      AddressZero,
      15000000000
    )
    await expect(tx2).to.be.revertedWith("don't call buyer throgh ETH")
  });

  //ETH기준으로 addDeal생성 후 tx전송 시 amount가 틀릴 경우
  it("account4 transfer to Escrow CA but amount diff", async () => {
    const tx = account4.sendTransaction({
      to: escrow.address,
      value: 10000000000
    })
    await expect(tx).to.be.revertedWith("wrong amount")
  });

  //ETH기준으로 addDeal생성 후 제대로 전송
  it("account4 transfer to Escrow CA but amount diff", async () => {
    const escrowA = (await escrowOwner.getBalance()).toString()
    // console.log(escrowA)
    const tx = await account4.sendTransaction({
      to: escrow.address,
      value: 15000000000
    })
    const escrowB = (await escrowOwner.getBalance()).toString()
    const escrowC = escrowB - escrowA
    // console.log(escrowC)
    await expect((await ton.balanceOf(account4.address)).toNumber()).to.equal(50)
    await expect(escrowC).to.be.above(15000000000)
  });

  // //escrowOwner가 addDeal을 한 후 account3가 escrow CA에 ETH를 전송하여서 TON을 구매합니다.
  // it("owner addDeal ether and user can buy", async () => {
  //   // console.log("ETH 보내기전 escrowOwner : ", (await escrowOwner.getBalance()).toString())
  //   const escorwA = (await escrowOwner.getBalance()).toString()
  //   const dealResult = await escrow.connect(escrowOwner).addDeal(
  //     account3.address,
  //     50,
  //     AddressZero,
  //     15000000000
  //   )
  //   const escorwB = (await escrowOwner.getBalance()).toString()
  //   const gasFee = escorwA - escorwB
  //   // console.log("gasFee : ", gasFee)
  //   // console.log("ETH 보내기전 account3.ether : ", (await account3.getBalance()).toString())
  //   // console.log("ETH 보내기전 account3.ton : ", (await ton.balanceOf(account3.address)).toNumber())
  //   const tx = await account3.sendTransaction({
  //     to: escrow.address,
  //     value: 15000000000
  //   })
  //   const escorwC = (await escrowOwner.getBalance()).toString()
  //   const escorwDiff = escorwC - escorwA + gasFee
  //   // console.log("escorwDiff : ", escorwDiff )
  //   // console.log("ETH 보낸 후  escrowOwner : ", (await escrowOwner.getBalance()).toString())
  //   // console.log("ETH 보낸 후  account3.ether : ", (await account3.getBalance()).toString())
  //   // console.log("ETH 보낸 후  account3.ton : ", (await ton.balanceOf(account3.address)).toNumber())
  // });

  // it("account1 ETH transfer to account3 and ", async () => {
  //   console.log("ETH 보내기전 account1 : ", (await account1.getBalance()).toString())
  //   console.log("ETH 보내기전 account3 : ", (await account3.getBalance()).toString())
  //   console.log("ETH 보내기전 account4 : ", (await account4.getBalance()).toString())
  //   console.log("ETH 보내기전 escrow : ", (await prov.getBalance(escrow.address)).toString())
  //   const tx = await account1.sendTransaction({
  //     to: escrow.address,
  //     value: 100000
  //   })
  //   console.log("ETH 보낸 후 account1 : ", (await account1.getBalance()).toString())
  //   console.log("ETH 보낸 후 escrow : ", (await prov.getBalance(escrow.address)).toString())
  //   // await expect(tx).to.be.revertedWith("ERC20: transfer amount exceeds balance")
  // });
  

})

export default {
  solidity: "0.8.0",
};
