# ton-escrow

if you want to test
```
npx hardhat test
```
<br>

## 초기 설정

tonOwner -> ton contract 배포자 -> TON을 100000개 가지고 있습니다.<br>
account1 -> ERC20 contract 배포자 -> ERC20을 100000개 가지고 있습니다.<br>
escrowOwner -> escrowOwner 배포자<br>


```javascript
const TOKEN_NAME = 'ERC20'
const TOKEN_SYMBOL = 'ERC'
const TOKEN_INITIAL_SUPPLY = 100000
const TON_NAME = 'Tokamak'
const TON_SYMBOL = 'TON'
const TON_INITIAL_SUPPLY = 100000
  
beforeEach(async () => {
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
describe('basic test', () => {
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
})
  
```

<br>

## TONEscrow owner 확인<br>

```javascript
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
  
```

<br>

## addDeal and dealDeal 테스트<br>
```javascript
  describe('addDeal test', () => {
     //escrowOwner가 account1이 ERC20을 150만큼 입금하면 50만큼 ton을 받을 수 있는 addDeal을 만듭니다.
    it("escrowOwner can addDeal", async () => {
      await escrow.connect(escrowOwner).addDeal(account1.address,50,ERC20.address,150)

      const dealResult = await escrow.connect(escrowOwner).deals(account1.address)

      await expect(dealResult.tonAmount.toNumber()).to.equal(50)
      await expect(dealResult.payTokenAmount.toNumber()).to.equal(150)
      await expect(dealResult.payToken).to.equal(ERC20.address)
    });

    //owner가 아니면 addDeal을 할 수 없습니다.
    it("not owner can't addDeal", async () => {
      const dealResult = escrow.connect(account2).addDeal(account1.address,50,ERC20.address,150)
      
      await expect(dealResult).to.be.revertedWith("Ownable: caller is not the owner")
    });
  })

  describe('delDeal test', () => {
    before(async () => {
      await escrow.connect(escrowOwner).addDeal(account1.address,50,ERC20.address,150)
    })

    //owner가 아니면 delDeal을 할 수 없습니다.
    it("not owner can't delDeal", async () => {
      const dealResult = escrow.connect(account2).delDeal(account1.address)

      await expect(dealResult).to.be.revertedWith("Ownable: caller is not the owner")
    });

    //escrowOwner은 delDeal을 할 수 있습니다.
    it("escrowOwner can delDeal", async () => {
      await escrow.connect(escrowOwner).delDeal(account1.address)

      const dealResult = await escrow.connect(escrowOwner).deals(account1.address)

      await expect(dealResult.tonAmount.toNumber()).to.equal(0)
      await expect(dealResult.payTokenAmount.toNumber()).to.equal(0)
      await expect(dealResult.payToken).to.equal(AddressZero)
    });
  })
  
```

<br>

## approve & addDeal 에 따른 ERC20 테스트 <br>

```javascript
  describe('approve && addDeal each test', () => {
    beforeEach(async () => {
      await ton.connect(tonOwner).transfer(escrow.address,500)
    })

    //approve && addDeal 안되어 있을 때 구매
    it("user can't buy the Ton before approve && addDeal", async () => {
      const buyResult = escrow.connect(account1).buy(ERC20.address,150)

      await expect(buyResult).to.be.revertedWith("wrong token")
    });

     //addDeal은 되어있고 approve는 안되어 있을 때 구매
    it("user can't buy the Ton before approve", async () => {
      await escrow.connect(escrowOwner).addDeal(account1.address,50,ERC20.address,150)

      const buyResult = escrow.connect(account1).buy(ERC20.address,150)

      await expect(buyResult).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
    });

    //addDeal은 안되어있고 approve만 되어있을 때 구매
    it("user can't buy the Ton before addDeal", async () => {      
      await ERC20.connect(account1).approve(escrow.address,150)

      const buyResult = escrow.connect(account1).buy(ERC20.address,150)

      await expect(buyResult).to.be.revertedWith("wrong token")
    });

  describe('buy input change after addDeal and approve', () => {
    beforeEach(async () => {
      await ton.connect(tonOwner).transfer(escrow.address,500) 
      await ERC20.connect(account1).approve(escrow.address,150)  
      await escrow.connect(escrowOwner).addDeal(account1.address,50,ERC20.address,150)
    });

    //addDeal와 approve했을 때 buy함수 호출 시 가격이 틀리면 살 수 없습니다.
    it("should enter addDeal and buy exactly amount.", async () => {
      const tx = escrow.connect(account1).buy(ERC20.address,100)

      await expect(tx).to.be.revertedWith("wrong amount")
    });

    //addDeal와 approve했을 때 buy함수 호출 시 입금주소가 틀리면 살 수 없습니다.
    it("should enter addDeal and buy exactly tokenAddress.", async () => {
      const tx = escrow.connect(account1).buy(ton.address,150)

      await expect(tx).to.be.revertedWith("wrong token")
    });

     // approve를 넘는 수량을 살 수 없습니다.
    it("A user cannot buy more than allowance", async () => {
      const tx = await ERC20.connect(account1).approve(escrow.address,100)  
      const tx2 = escrow.connect(account1).buy(ERC20.address,150)

      await expect(tx2).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
    });

    //addDeal과 approve 둘다 되어있지만 CA의 ton 수량이 부족할 때
    it("user can buy after addDeal and approve but CA ton amount lack", async () => {
      await escrow.connect(escrowOwner).addDeal(account1.address,550,ERC20.address,150)
      const buyTx = escrow.connect(account1).buy(ERC20.address,150)

      await expect(buyTx).to.be.revertedWith("don't have ton amount")
    });

    //addDeal과 approve 둘다 되어있을때 구매 (addDeal에서의 입력이 맞아야한다.) 정상작동
    it("user can buy after addDeal and approve ", async () => {
      await escrow.connect(account1).buy(ERC20.address,150)

      await expect((await ton.balanceOf(escrow.address)).toNumber()).to.equal(450)
      await expect((await ERC20.balanceOf(escrowOwner.address)).toNumber()).to.equal(150)
      await expect((await ton.balanceOf(account1.address)).toNumber()).to.equal(50)
    });

    //addDeal의 payee주소는 중복이 안됩니다.
    it("payee address is only one order", async () => {
      await escrow.connect(escrowOwner).addDeal(account1.address,100,ERC20.address,100)
      const tx = escrow.connect(account1).buy(ERC20.address,150)
      await expect(tx).to.be.revertedWith("wrong amount")

      await escrow.connect(account1).buy(ERC20.address,100)

      await expect((await ton.balanceOf(escrow.address)).toNumber()).to.equal(400)
      await expect((await ERC20.balanceOf(escrowOwner.address)).toNumber()).to.equal(100)
      await expect((await ton.balanceOf(account1.address)).toNumber()).to.equal(100)
    });
  })

  })
  
```

<br>

## addDeal 에 따른 ETH 테스트 <br>
```javascript
  describe('ETH transfer test', () => {
    beforeEach(async () => {
      await ton.connect(tonOwner).transfer(escrow.address,500)
      await escrow.connect(escrowOwner).addDeal(account4.address,50,AddressZero,15000000000)
    })

    //ETH기준으로 addDeal생성 후 buy함수 호출 시
    it("owner can addDeal and user call the function buy", async () => {
      const tx2 = escrow.connect(account4).buy(AddressZero,15000000000)

      await expect(tx2).to.be.revertedWith("don't call buyer throgh ETH")
    });

    //ETH기준으로 addDeal생성 후 tx전송 시 amount(작게)가 틀릴 경우
    it("user transfer to Escrow CA but amount diff", async () => {
      const tx = account4.sendTransaction({to: escrow.address,value: 10000000000})

      await expect(tx).to.be.revertedWith("wrong amount")
    });

    //ETH기준으로 addDeal생성 후 tx전송 시 amount(작크게)가 틀릴 경우
    it("user transfer to Escrow CA but amount diff", async () => {
      const tx = account4.sendTransaction({to: escrow.address,value: 20000000000})

      await expect(tx).to.be.revertedWith("wrong amount")
    });

    //ETH기준으로 addDeal생성 후 제대로 전송
    it("user transfer to Escrow CA exactly", async () => {
      await expect(() =>
        account4.sendTransaction({to:escrow.address, gasPrice: 0, value: 15000000000})
      ).to.changeBalances([account4, escrowOwner], [-15000000000, 15000000000])
    });
  })
  
```

<br>

## withdraw 테스트 <br>
```javascript
  describe('withdraw test', () => {
    beforeEach(async () => {
      await ton.connect(tonOwner).transfer(escrow.address,500)
    })
    
    //withdraw owner가 아닐때
    it("user can't withdraw the ton", async () => {
      const tx = escrow.connect(account4).withdraw(400)
      await expect(tx).to.be.revertedWith("Ownable: caller is not the owner")
    });

    //CA가 가지고 있는 ton 보다 많은 수량 withdraw
    it("withdraw the ton but escrow CA don't have ton", async () => {
      const tx = escrow.connect(escrowOwner).withdraw(600)
      await expect(tx).to.be.revertedWith("don't have ton amount")
    });

    //CA가 가지고 있는 ton과 같은 수량 withdraw
    it("withdraw the all ton amount", async () => {
      await escrow.connect(escrowOwner).withdraw(500)
      const tonBalance = await ton.balanceOf(escrowOwner.address)
      await expect(tonBalance).to.equal(500)
    });
  
    //CA가 가지고 있는 ton 보다 작은 수량 withdraw
    it("owner can withdraw the ton", async () => {
      await escrow.connect(escrowOwner).withdraw(400) 
      const tonBalance = await ton.balanceOf(escrowOwner.address)
      await expect(tonBalance).to.equal(400)
    });
  })

```

<br>

## event 테스트 <br>
```javascript
  describe('event check', () => {
    let addDealTx : any
    beforeEach(async () =>{
      await ton.connect(tonOwner).transfer(escrow.address,500)
      await ERC20.connect(account1).approve(escrow.address,150)  
      addDealTx = await escrow.connect(escrowOwner).addDeal(account1.address,50,ERC20.address,150)
    })

    //addDeal event check
    it("addDeal event check", async () => {      
      await expect(addDealTx).to.emit(escrow, 'DealAdded').withArgs(account1.address, 50, ERC20.address, 150)
    });

    //DealDeled event check
    it("DealDeled event check", async () => {
      const delDealTx = await escrow.connect(escrowOwner).delDeal(account1.address)
      await expect(delDealTx).to.emit(escrow, 'DealDeled').withArgs(account1.address, 50, ERC20.address, 150)
    });

    //Dealt event check
    it("Dealt event check", async () => {
      const buyTx = await escrow.connect(account1).buy(ERC20.address,150)      
      await expect(buyTx).to.emit(escrow, 'Dealt').withArgs(account1.address, 50, ERC20.address, 150)
    });
  })
```

<br>

## owner change 테스트 <br>
```javascript
  describe('owner change test', () => {
    //user는 owner를 바꿀 수 없습니다.
    it("user can't changer owenr ", async () => {
      const tx = escrow.connect(account3).transferOwnership(account4.address)
      expect(tx).to.be.revertedWith("Ownable: caller is not the owner")
    });
  
    //owner는 owner를 바꿀 수 없습니다.
    it("escrowOwner can changer owenr ", async () => {
      await escrow.connect(escrowOwner).transferOwnership(account4.address)
      const tx = await escrow.owner()
      expect(tx).to.equal(account4.address)
    });
  })
```

<br>

## balance 테스트 값차이 원인 && gaslimit 테스트 <br>
```javascript
  describe('why different balance test && gaslimit compare', () => {
    //escrowOwner가 addDeal을 한 후 account3가 escrow CA에 ETH를 전송하여서 TON을 구매합니다.
    it("owner addDeal ether and user can buy", async () => {
      await ton.connect(tonOwner).transfer(escrow.address,500)
      await escrow.connect(escrowOwner).addDeal(account4.address,50,AddressZero,15000000000)
      const escrowA = (await escrowOwner.getBalance())
      const bigNumberA = (BigNumber.from(escrowA._hex))
      await account4.sendTransaction({to: escrow.address, value: 15000000000})
      await expect((await ton.balanceOf(account4.address)).toNumber()).to.equal(50)
      const escrowB = (await escrowOwner.getBalance())
      const bigNumberB = (BigNumber.from(escrowB._hex))
      const escrowC = bigNumberB.sub(bigNumberA)
      // console.log(escrowC.toString())
      await expect(escrowC).to.equal(15000000000)
    });

    //escrowOwner가 addDeal을 한 후 account3가 escrow CA에 ETH를 전송하여서 TON을 구매합니다.
    it("gasLimit is above 89000", async () => {
      await ton.connect(tonOwner).transfer(escrow.address,500)
      await escrow.connect(escrowOwner).addDeal(account4.address,50,AddressZero,15000000000)
      const tx = await account4.sendTransaction({to: escrow.address, value: 15000000000})
      console.log("TONEscrow transfer to ton buy | gasLimit :", tx.gasLimit.toNumber())
      const tx2 = await account2.sendTransaction({to: account1.address, value: 15000000000})
      console.log("basic transfer to account1 | gasLimit :", tx2.gasLimit.toNumber())
    });
  })
```

<br>