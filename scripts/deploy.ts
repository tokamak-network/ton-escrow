const { ethers } = require('hardhat')

async function main() {
    const [deployer] = await ethers.getSigners()
    const tonAddress = "0x44d4F5d89E9296337b8c48a332B3b2fb2C190CD0"
    const rinkManagerAddress = "0x6DBce262B7b32806B823c73dB9044dDAf2D63275"

    console.log("Deploying contract with the account :", deployer.address)

    const tonEscrow = await ethers.getContractFactory('TONEscrow')
    const escrow = await tonEscrow.deploy(tonAddress)

    console.log("tonEscrow Address: ", escrow.address)
    await escrow.deployed()
    // await escrow.connect(deployer).transferOwnership(manager.address)
    await escrow.connect(deployer).transferOwnership(rinkManagerAddress)
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