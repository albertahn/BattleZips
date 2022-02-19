const { addContract } = require('../test/utils/biconomy')
const POLYGON_DAI = '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063' // address of Polygon PoS Dai token
///https://docs.biconomy.io/misc/contract-addresses
const RINKEBY_FORWARDER ='0xFD4973FeB2031D4409fB57afEE5dF2051b171104'
const GOERLI_FORWARDER = '0xE041608922d06a4F26C0d4c27d8bCD01daf1f792'

/**
 * Deploy All Contracts
 */
module.exports = async ({ run, ethers, network, deployments }) => {
    // get deploying account
    const [operator] = await ethers.getSigners();
    // deploy verifiers
    const { address: bvAddress } = await deployments.deploy('BoardVerifier', {
        from: operator.address,
        log: true
    })
    const { address: svAddress } = await deployments.deploy('ShotVerifier', {
        from: operator.address,
        log: true
    })
    
    // deploy Battleship Game Contract / Victory token
    const { address: gameAddress } = await deployments.deploy('BattleshipGame', {
        from: operator.address,
        args: [GOERLI_FORWARDER, bvAddress, svAddress],
        log: true
    })
    // verify deployed contracts
    try {
        await run('verify:verify', { address: bvAddress })
    } catch (e) {
        console.log(e)
        if (!alreadyVerified(e.toString())) throw new Error()
    }
    try {
        await run('verify:verify', { address: svAddress })
    } catch (e) {
        console.log(e)
        if (!alreadyVerified(e.toString())) throw new Error()
    }
    try {
        await run('verify:verify', {
            address: gameAddress,
            constructorArguments: [GOERLI_FORWARDER, bvAddress, svAddress]
        })
    } catch (e) {
        console.log(e)
        if (!alreadyVerified(e.toString())) throw new Error()
    }
    // add to biconomy
    await addContract(gameAddress)
    console.log('Deployed, Verified, Relay Authorized')
}

/**
 * Determine if err message can be ignored
 * @param {string} err - the error text returned from etherscan verification
 * @return true if bytecode is verified, false otherwise 
 */
const alreadyVerified = (err) => {
    return err.includes('Reason: Already Verified')
        || err.includes('Contract source code already verified')
}

module.exports.tags = ['Verifier']