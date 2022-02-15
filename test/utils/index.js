/// ZK-Battleship Utilities
const biconomy = require('./biconomy')
const { ethers } = require('hardhat')
const { buildMimcSponge } = require("circomlibjs")

const one = ethers.utils.parseUnits('1', 'ether') // 1e18

// verification key json files
const verificationKeys = {
    board: require('../../zk/board_verification_key.json'),
    shot: require('../../zk/shot_verification_key.json')
}

// x, y, z (horizontal/ verical orientation) ship placements
const boards = {
    alice: [
        ["0", "0", "0"],
        ["0", "1", "0"],
        ["0", "2", "0"],
        ["0", "3", "0"],
        ["0", "4", "0"]
    ],
    bob: [
        ["1", "0", "0"],
        ["1", "1", "0"],
        ["1", "2", "0"],
        ["1", "3", "0"],
        ["1", "4", "0"]
    ]
}

// shots alice to hit / bob to miss
const shots = {
    alice: [
        [1, 0], [2, 0], [3, 0], [4, 0], [5, 0],
        [1, 1], [2, 1], [3, 1], [4, 1],
        [1, 2], [2, 2], [3, 2],
        [1, 3], [2, 3], [3, 3],
        [1, 4], [2, 4]
    ],
    bob: [
        [9, 9], [9, 8], [9, 7], [9, 6], [9, 5],
        [9, 4], [9, 3], [9, 2], [9, 1],
        [9, 0], [8, 9], [8, 8],
        [8, 7], [8, 6], [8, 5],
        [8, 4]
    ]
}

/**
 * Build contract call args
 * @dev 'massage' circom's proof args into format parsable by solidity
 * @notice further mutation of pi_b occurs @ in our smart contract 
 *         calldata as subgraphs cannot handle nested arrays
 * 
 * @param {Object} proof - the proof generated from circom circuit
 * @returns - array of uint256 representing proof parsable in solidity
 */
function buildProofArgs(proof) {
    return [
        proof.pi_a.slice(0, 2), // pi_a
        // genZKSnarkProof reverses values in the inner arrays of pi_b
        proof.pi_b[0].slice(0).reverse(),
        proof.pi_b[1].slice(0).reverse(),
        proof.pi_c.slice(0, 2), // pi_c
    ]
}

/**
 * Initialize new environment for interacting with ZK-Battleship game contracts
 * 
 * @param {string} forwarder - address of erc2771 trusted forwarder contract
 * @returns {Object} :
 *  - sv: ShotVerifier contract object
 *  - bv: BoardVerifier contract object
 *  - token: Mock ERC20 contract object
 *  - game: ZK-Battleship contract object
 *  - mimcSponge: initialized MiMC Sponge ZK-Friendly hash function object from circomlibjs
 *  - boardHashes: hashed versions of alice/ bob boards
 *  - F: initialized ffjavascript BN254 curve object derived from mimcSponge
 */
async function initialize(forwarder) {
    // deploy verifiers
    const svFactory = await ethers.getContractFactory('ShotVerifier')
    const sv = await svFactory.deploy()
    const bvFactory = await ethers.getContractFactory('BoardVerifier')
    const bv = await bvFactory.deploy()
    // deploy ticket token
    const tokenFactory = await ethers.getContractFactory('Token')
    const token = await tokenFactory.deploy()
    // deploy game
    const gameFactory = await ethers.getContractFactory('BattleshipGame')
    const game = await gameFactory.deploy(forwarder, bv.address, sv.address, token.address)

    // set players
    const signers = await ethers.getSigners()
    const alice = signers[1]
    const bob = signers[2]
    // give players tickets and allow game contract to spend
    await (await token.connect(alice).mint(alice.address, one)).wait()
    await (await token.connect(alice).approve(game.address, one)).wait()
    await (await token.connect(bob).mint(bob.address, one)).wait()
    await (await token.connect(bob).approve(game.address, one)).wait()
    // instantiate mimc sponge on bn254 curve + store ffjavascript obj reference
    const mimcSponge = await buildMimcSponge()
    // store board hashes for quick use
    const boardHashes = {
        alice: await mimcSponge.multiHash(boards.alice.flat()),
        bob: await mimcSponge.multiHash(boards.bob.flat())
    }
    return { sv, bv, token, game, mimcSponge, boardHashes, F: mimcSponge.F }
}

// inline ephemeral logging
function printLog(msg) {
    if (process.stdout.isTTY) {
        process.stdout.clearLine(-1);
        process.stdout.cursorTo(0);
        process.stdout.write(msg);
    }
}

module.exports = {
    one,
    boards,
    shots,
    verificationKeys,
    initialize,
    buildProofArgs,
    printLog,
    biconomy
}