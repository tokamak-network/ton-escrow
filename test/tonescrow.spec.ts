const { AddressZero } = require("@ethersproject/constants");
const { ethers, network } = require('hardhat')
const chai = require('chai')
const { solidity } = require('ethereum-waffle')
const { expect } = chai

chai.use(solidity)

describe("Token deploy", () => {
  const TOKEN_NAME = 'ERC20'
  const TOKEN_SYMBOL = 'ERC'
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

  beforeEach(async () => {
    [ tonOwner, escrowOwner, account1, account2, account3, account4 ] = await ethers.getSigners();
    const erc20Factory = await ethers.getContractFactory("mockERC20");
    prov = ethers.getDefaultProvider();
    //ton deploy
    ton = await erc20Factory.deploy(
      TON_NAME,
      TON_SYMBOL,
      TON_INITIAL_SUPPLY
    );
      
    //ERC20 deploy
    const erc20_Factoey = await ethers.getContractFactory('mockERC20');
    ERC20 = await erc20_Factoey.connect(account1).deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      TOKEN_INITIAL_SUPPLY
    );

    //tonEscrow deploy
    const tonEscrow = await ethers.getContractFactory("TONEscrow")
    escrow = await tonEscrow.connect(escrowOwner).deploy(
      ton.address
    )
  })

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
    expect(tokenSupply).to.equal(TON_INITIAL_SUPPLY)
  });

  //tonOwner는 TON을 가지고 있습니다.
  it("tonOwner have a TON tonOwner.balance = TON_INITIAL_SUPPLY ", async () => {
    const balance1 = await ton.balanceOf(tonOwner.address)
    expect(balance1).to.equal(TON_INITIAL_SUPPLY)
  });

  //user는 TON이 없습니다.
  it("user have a TON account1.balance = 0", async () => {
    const balance1 = await ton.balanceOf(account1.address)
    expect(balance1).to.equal(0)
  });

  //tonOwner가 escrowCA에 500TON을 전송합니다.
  it("tonOwner transfer to escrow CA", async () => {
    const tx = await ton.connect(tonOwner).transfer(
      escrow.address,
      500
    )
    await tx.wait()

    const balance1 = await ton.balanceOf(tonOwner.address)
    const balance2 = await ton.balanceOf(escrow.address)
    expect(balance1).to.equal(TON_INITIAL_SUPPLY-500)
    expect(balance2).to.equal(500)
  });

  //TONEscrow의 owner는 escrowOwner입니다.
  it("TONEscrow.owner is escrowOwner", async () => {
    const owner = await escrow.owner()
    expect(owner).to.equal(escrowOwner.address)
  });

  //TONEscrow의 owner는 user가 아닙니다.
  it("TONEscrow.owner is not user", async () => {
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
    const tx = await escrow.connect(escrowOwner).addDeal(
      account1.address,
      50,
      ERC20.address,
      150
    )

    const dealResult = escrow.connect(account2).delDeal(
      account1.address
    )
    await expect(dealResult).to.be.revertedWith("Ownable: caller is not the owner")
  });

  //escrowOwner은 delDeal을 할 수 있습니다.
  it("escrowOwner can delDeal", async () => {
    const tx = await escrow.connect(escrowOwner).addDeal(
      account1.address,
      50,
      ERC20.address,
      150
    )

    const tx2 = escrow.connect(escrowOwner).delDeal(
      account1.address
    )

    const dealResult = await escrow.connect(escrowOwner).deals(account1.address)
    await expect(dealResult.tonAmount.toNumber()).to.equal(0)
    await expect(dealResult.payTokenAmount.toNumber()).to.equal(0)
    await expect(dealResult.payToken).to.equal(AddressZero)
  });

  //approve && addDeal 안되어 있을 때 구매
  it("user can't buy the Ton before approve && addDeal", async () => {
    const tonDeposit = await ton.connect(tonOwner).transfer(
      escrow.address,
      500
    )

    const buyResult = escrow.connect(account1).buy(
      ERC20.address,
      150
    )
    await expect(buyResult).to.be.revertedWith("wrong token")
  });

  //addDeal은 되어있고 approve는 안되어 있을 때 구매
  it("user can't buy the Ton before approve", async () => {
    const tonDeposit = await ton.connect(tonOwner).transfer(
      escrow.address,
      500
    )

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
  it("user can't buy the Ton before addDeal", async () => {
    const tonDeposit = await ton.connect(tonOwner).transfer(
      escrow.address,
      500
    )
    
    const tx = await ERC20.connect(account1).approve(
      escrow.address,
      150
    )

    const buyResult = escrow.connect(account1).buy(
      ERC20.address,
      150
    )
    await expect(buyResult).to.be.revertedWith("wrong token")
  });

  //addDeal과 approve 둘다 되어있을때 구매 (addDeal에서의 입력이 맞아야한다.)
  it("user can buy after addDeal and approve ", async () => {
    const tonDeposit = await ton.connect(tonOwner).transfer(
      escrow.address,
      500
    )

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
  it("A user cannot buy more than allowance", async () => {
    const tonDeposit = await ton.connect(tonOwner).transfer(
      escrow.address,
      500
    )

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
      150
    )

    await expect(tx2).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
  });

  //addDeal과 approve 둘다 되어있지만 CA의 ton 수량이 부족할 때
  it("user can buy after addDeal and approve ", async () => {
    const tonDeposit = await ton.connect(tonOwner).transfer(
      escrow.address,
      10
    )

    const tx = await escrow.connect(escrowOwner).addDeal(
      account1.address,
      50,
      ERC20.address,
      150
    )
 
    const tx2 = await ERC20.connect(account1).approve(
      escrow.address,
      150
    )

    const buyTx = escrow.connect(account1).buy(
      ERC20.address,
      150
    )

    await expect(buyTx).to.be.revertedWith("don't have ton amount")
  });

  //ETH기준으로 addDeal생성 후 buy함수 호출 시
  it("owner can addDeal and account4 call the function buy", async () => {
    const tonDeposit = await ton.connect(tonOwner).transfer(
      escrow.address,
      500
    )

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
  it("user transfer to Escrow CA but amount diff", async () => {
    const tonDeposit = await ton.connect(tonOwner).transfer(
      escrow.address,
      500
    )

    const dealResult = await escrow.connect(escrowOwner).addDeal(
      account4.address,
      50,
      AddressZero,
      15000000000
    )

    const tx = account4.sendTransaction({
      to: escrow.address,
      value: 10000000000
    })

    await expect(tx).to.be.revertedWith("wrong amount")
  });

  //ETH기준으로 addDeal생성 후 제대로 전송
  it("user transfer to Escrow CA exactly", async () => {
    const tonDeposit = await ton.connect(tonOwner).transfer(
      escrow.address,
      500
    )

    const dealResult = await escrow.connect(escrowOwner).addDeal(
      account4.address,
      50,
      AddressZero,
      15000000000
    )

    await expect(() =>
      account4.sendTransaction({to:escrow.address, gasPrice: 0, value: 15000000000})
    ).to.changeBalance(escrowOwner, 15000000000)
  });
  
  //withdraw ton이 없을때 (수량이 부족할때)
  it("withdraw the ton but escrow CA don't have ton", async () => {
    const tx = escrow.connect(escrowOwner).withdraw(
      400
    )
    await expect(tx).to.be.revertedWith("don't have ton amount")
  });

  //withdraw owner가 아닐때
  it("user can't withdraw the ton", async () => {
    const tonDeposit = await ton.connect(tonOwner).transfer(
      escrow.address,
      500
    )

    const tx = escrow.connect(account4).withdraw(
      400
    )
    await expect(tx).to.be.revertedWith("Ownable: caller is not the owner")
  });

  //withdraw 정상작동(owner고 ton도 있음)
  it("user can't withdraw the ton", async () => {
    const tonDeposit = await ton.connect(tonOwner).transfer(
      escrow.address,
      500
    )

    const tx = await escrow.connect(escrowOwner).withdraw(
      400
    )
    const tonBalance = await ton.balanceOf(escrowOwner.address)
    await expect(tonBalance).to.equal(400)
  });

  //addDeal event check
  it("addDeal event check", async () => {
    const tx = await escrow.connect(escrowOwner).addDeal(
      account1.address,
      50,
      ERC20.address,
      150
    )
    
    await expect(tx).to.emit(escrow, 'DealAdded').withArgs(account1.address, 50, ERC20.address, 150)
  });

  //DealDeled event check
  it("DealDeled event check", async () => {
    const tx = await escrow.connect(escrowOwner).addDeal(
      account1.address,
      50,
      ERC20.address,
      150
    )

    const tx2 = escrow.connect(escrowOwner).delDeal(
      account1.address
    )
    
    await expect(tx2).to.emit(escrow, 'DealDeled').withArgs(account1.address, 50, ERC20.address, 150)
  });

  //Dealt event check
  it("Dealt event check", async () => {
    const tonDeposit = await ton.connect(tonOwner).transfer(
      escrow.address,
      500
    )

    const tx = await escrow.connect(escrowOwner).addDeal(
      account1.address,
      50,
      ERC20.address,
      150
    )

    const tx2 = await ERC20.connect(account1).approve(
      escrow.address,
      150
    )

    const buyTx = escrow.connect(account1).buy(
      ERC20.address,
      150
    )
    
    await expect(buyTx).to.emit(escrow, 'Dealt').withArgs(account1.address, 50, ERC20.address, 150)
  });

  //user는 owner를 바꿀 수 없습니다.
  it("user can't changer owenr ", async () => {
    const tx = escrow.connect(account3).transferOwnership(
      account4.address
    )

    expect(tx).to.be.revertedWith("Ownable: caller is not the owner")
  });

  //owner는 owner를 바꿀 수 없습니다.
  it("escrowOwner can changer owenr ", async () => {
    const tx = await escrow.connect(escrowOwner).transferOwnership(
      account4.address
    )

    const tx2 = await escrow.owner()
    expect(tx2).to.equal(account4.address)
  });
})

export default {
  solidity: "0.8.0",
};
