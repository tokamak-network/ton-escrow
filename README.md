# ton-escrow

if you want to test
```
npx hardhat test
```
<br>
궁금증.. ton이 transfer함수는 상관없는지? 

## 초기 설정

tonOwner -> ton contract 배포자 -> TON을 100000개 가지고 있습니다.<br>
account1 -> ERC20 contract 배포자 -> ERC20을 100000개 가지고 있습니다.<br>
escrowOwner -> escrowOwner 배포자<br>


```javascript
const TOKEN_NAME = 'PCI_ERC20'
const TOKEN_SYMBOL = 'PCI'
const TOKEN_INITIAL_SUPPLY = 100000
const TON_NAME = 'Tokamak'
const TON_SYMBOL = 'TON'
const TON_INITIAL_SUPPLY = 100000
  
before(async () => {
    [ tonOwner, escrowOwner, account1, account2, account3, account4 ] = await ethers.getSigners();
    const erc20Factory = await ethers.getContractFactory("mockERC20");
    prov = ethers.getDefaultProvider();

    ton = await erc20Factory.deploy(
      TON_NAME,
      TON_SYMBOL,
      TON_INITIAL_SUPPLY
    );
      
    const erc20_Factoey = await ethers.getContractFactory('mockERC20');
    ERC20 = await erc20_Factoey.connect(account1).deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      TOKEN_INITIAL_SUPPLY
    );

    const tonEscrow = await ethers.getContractFactory("TONEscrow")
    escrow = await tonEscrow.connect(escrowOwner).deploy(
      ton.address
    )
  })
```

<br>

## TON 설정 체크<br>
```javascript
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
   
  //account1은 TON이 없습니다.
  it("account1 have a TON account1.balance = 0", async () => {
    const balance1 = await ton.balanceOf(account1.address)
    expect(balance1).to.equal(0)
  });
  
```

<br>

## TON -> TONEscrow CA 전송 및 TONEscrow owner 확인<br>

```javascript
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

  //TONEscrow의 owner는 account1이 아닙니다.
  it("TONEscrow.owner is not account1", async () => {
    const owner = await escrow.owner()
    expect(owner).to.not.equal(account1.address)
  });
  
```

<br>

## addDeal,delDeal기능 및 Owner만 가능한지 확인<br>
```javascript
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

  //account1은 addDeal을 할 수 없습니다.
  it("account1 can't addDeal", async () => {
    const dealResult = escrow.connect(account1).addDeal(
      account2.address,
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
    await expect(dealResult.tonAmount.toNumber()).to.equal(0)
    await expect(dealResult.payTokenAmount.toNumber()).to.equal(0)
    await expect(dealResult.payToken).to.equal(AddressZero)
  });
  
```

<br>

## approve & addDeal 에 따른 ERC20 테스트 <br>

```javascript
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

  //addDeal과 approve 둘다 되어있을때 구매(addDeal에서의 입력이 맞아야한다.)
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
  
```

<br>

## addDeal 에 따른 ETH 테스트 <br>
```javascript
  //ETH기준으로 addDeal생성 후 buy함수 호출 시
  it("account1 can buy the Ton through TONEscrow", async () => {
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
    const tx = await account4.sendTransaction({
      to: escrow.address,
      value: 15000000000
    })
    const escrowB = (await escrowOwner.getBalance()).toString()
    const escrowC = escrowB - escrowA
    await expect((await ton.balanceOf(account4.address)).toNumber()).to.equal(50)
    await expect(escrowC).to.be.above(15000000000)
  });


  
```
