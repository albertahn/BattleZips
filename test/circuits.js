require('dotenv').config()
const { boards, shots, verificationKeys, buildProofArgs } = require('./utils')
const path = require('path')
const { wasm: wasm_tester, wasm } = require('circom_tester')
const { buildMimcSponge } = require('circomlibjs')

describe('Test circuits', async () => {

    let mimcSponge

    before(async () => {
        mimcSponge = await buildMimcSponge()
    })

    xit("Prove valid board", async () => {
        const shipHash = mimcSponge.multiHash(boards.alice.flat())
        const circuit = await wasm_tester(path.resolve('zk/circuits/board.circom'))
        const witness = await circuit.calculateWitness({
            ships: boards.alice,
            hash: mimcSponge.F.toObject(shipHash)
        })
        await circuit.assertOut(witness, {})

    })
    it("Fail to prove invalid board", async () => {
        // const badBoard = [
        //     ["0", "0", "0"],
        //     ["0", "1", "0"],
        //     ["0", "2", "0"],
        //     ["0", "3", "0"],
        //     ["0", "0", "0"]
        // ]
        const badBoard = [
            [1, 1, 1],
            [4, 2, 0],
            [7, 2, 1],
            [6, 7, 0],
            [8, 6, 0]
        ]
        const shipHash = mimcSponge.multiHash(badBoard.flat())
        const circuit = await wasm_tester(path.resolve('zk/circuits/board.circom'))
        const witness = await circuit.calculateWitness({
            ships: badBoard,
            hash: mimcSponge.F.toObject(shipHash)
        })
        await circuit.assertOut(witness, {})
    })
})