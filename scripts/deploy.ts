const { ethers } = require('hardhat')
const { BigNumber } = require("ethers")
const { AddressZero } = require("@ethersproject/constants");

async function main() {
    const [deployer] = await ethers.getSigners()
    const tonAddress = "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5"
    const mainnetManagerAddress = "0x513E00D21b5fc245f7e44fB409E0aCc19645D3bd"
    const rinktonAddress = "0x44d4F5d89E9296337b8c48a332B3b2fb2C190CD0"
    const rinkManagerAddress = "0x6DBce262B7b32806B823c73dB9044dDAf2D63275"

    console.log("Deploying contract with the account :", deployer.address)

    const BASE_TEN = 10
    const decimals = 18
    let tonAmount = 500
    let bigTonAmount = BigNumber.from(tonAmount).mul(BigNumber.from(BASE_TEN).pow(decimals))
    let otherAmount = 12933
    let bigOtherAmount = (BigNumber.from(otherAmount).mul(BigNumber.from(BASE_TEN).pow(decimals))).div(10000)
    // console.log("bigTonAmount : ", bigTonAmount.toString())
    // console.log("bigOtherAmount : ", bigOtherAmount.toString())
    // console.log("ADDRESS ZERO :", AddressZero)
    
    const tonEscrow = await ethers.getContractFactory('TONEscrow')
    const escrow = await tonEscrow.deploy(tonAddress)

    console.log("tonEscrow Address: ", escrow.address)
    await escrow.deployed()

    // 교환비: 1TON= 0.0025866 ETH
    // 다날에서 보내는 이더: 1.2933ETH
    // 다날 핀테크 이더 주소: 0x887AF02970781A088962DBaa299a1EBA8D573321
    // 구매수량: 500 TON

    // 거래자Address : 0x887AF02970781A088962DBaa299a1EBA8D573321
    // tonAmount : 500
    // 거래토큰Address : AddressZero
    // 거래토큰amount : 1.2933

    // bignumber other test : 500000000000000000000
    // bigTonAmount :  500000000000000000000 -> 500.000000000000000000
    // rinkeby test ton :                        50.000000000000000000
    // bigOtherAmount :  1293300000000000000 -> 1.293300000000000000
    // rinkeby test ether :                     0.129330000000000000

    await escrow.connect(deployer).addDeal(
        "0x887AF02970781A088962DBaa299a1EBA8D573321",
        bigTonAmount,
        AddressZero,
        bigOtherAmount
    )
    await escrow.connect(deployer).transferOwnership(mainnetManagerAddress)
    const escrowTonAddress = await escrow.ton()
    console.log("escrowTonAddress : ", escrowTonAddress)

    //gas: 9500000,
    // gasMultiplier: 100,
    // blockGasLimit: 124500000,
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });