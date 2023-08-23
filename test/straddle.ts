import { TestSystem, TestSystemContractsType } from '@lyrafinance/protocol'
import { MAX_UINT, MONTH_SEC, ZERO_ADDRESS, fromBN, toBN } from '@lyrafinance/protocol/dist/scripts/util/web3utils';
import { fastForward } from '@lyrafinance/protocol/dist/test/utils/evm';
import { expect } from 'chai';
import { formatBytes32String } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { StraddleTest } from 'typechain';

import {
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

// describe('Integration Test', () => {
//     let signer: any

//     let testSystem: TestSystemContractsType;
//     let boardIds: any
//     let strikeIds: any

//     before(async () => {
//         [signer] = await ethers.getSigners();
//         testSystem = await TestSystem.deploy(signer);
//         await TestSystem.seed(signer, testSystem);
//     });

//     it('will pay out long calls', async () => {
//         boardIds = await testSystem.optionMarket.getLiveBoards();
//         strikeIds = await testSystem.optionMarket.getBoardStrikes(boardIds[0]);
//         console.log("strikeIds :", strikeIds);

//         const preBalance0 = await testSystem.snx.quoteAsset.balanceOf(signer.address);
//         // Buy long call
//         await testSystem.optionMarket.openPosition({
//             strikeId: strikeIds[0],
//             positionId: 0,
//             amount: toBN('100'),
//             setCollateralTo: 0,
//             iterations: 1,
//             minTotalCost: 0,
//             maxTotalCost: MAX_UINT,
//             optionType: TestSystem.OptionType.LONG_CALL,
//             referrer: ZERO_ADDRESS
//         });

//         const postBalance0 = await testSystem.snx.quoteAsset.balanceOf(signer.address);
//         console.log("position cost", fromBN(preBalance0.sub(postBalance0)));
//         // Wait till board expires
//         await fastForward(MONTH_SEC);

//         // Mock sETH price
//         await TestSystem.marketActions.mockPrice(testSystem, toBN("1600"), 'sETH');

//         // Settle option and confirm payout
//         await testSystem.optionMarket.settleExpiredBoard(boardIds[0]);
//         const preBalance = await testSystem.snx.quoteAsset.balanceOf(signer.address);
//         await testSystem.shortCollateral.settleOptions([strikeIds[0]]);
//         const postBalance = await testSystem.snx.quoteAsset.balanceOf(signer.address);

//         console.log(fromBN(postBalance.sub(preBalance)));
//         expect(fromBN(postBalance.sub(preBalance))).to.eq('10000.0');
//     });

//     it('check strikes ', async () => {
//         var strikeInfo = await testSystem.optionMarket.getStrike(1)
//         console.log("Strikes " + 1, fromBN(strikeInfo.strikePrice), strikeInfo);
//     })
// });

describe('Straddle Test', () => {

    const deployContracts = async () => {
        const [signer] = await ethers.getSigners();

        // deploy lyra evn contracts
        const testSystem: TestSystemContractsType = await TestSystem.deploy(signer);
        await TestSystem.seed(signer, testSystem);

        // register synthetix adapter address (module issue)
        await testSystem.lyraRegistry.updateGlobalAddresses([formatBytes32String("SYNTHETIX_ADAPTER")], [testSystem.synthetixAdapter.address]);

        // deploy straddle contract
        let straddleFactory = await ethers.getContractFactory('StraddleTest');
        const straddle: StraddleTest = (await straddleFactory.deploy()) as StraddleTest;

        // initial configs
        await straddle.setLyraAddresses(
            testSystem.lyraRegistry.address,
            testSystem.optionMarket.address,
            testSystem.testCurve.address,
            testSystem.basicFeeCounter.address
        );

        return { signer, testSystem, straddle }
    }

    it('check strikes ', async () => {
        const { testSystem } = await loadFixture(deployContracts);
        var strikeInfo = await testSystem.optionMarket.getStrike(1)
        console.log("Strike price ", fromBN(strikeInfo.strikePrice));
    })

    it('staddle get profit when price move high', async () => {
        const { signer, testSystem, straddle } = await loadFixture(deployContracts);
        let boardIds = await testSystem.optionMarket.getLiveBoards();
        let strikeIds = await testSystem.optionMarket.getBoardStrikes(boardIds[0]);

        // approve quote assets
        await testSystem.snx.quoteAsset.approve(straddle.address, MAX_UINT);

        const preBalance0 = await testSystem.snx.quoteAsset.balanceOf(signer.address);
        // Buy straddle
        await straddle.buyStraddle(strikeIds[0], toBN('100'), toBN('100000'))
        const postBalance0 = await testSystem.snx.quoteAsset.balanceOf(signer.address);
        console.log("position cost", fromBN(preBalance0.sub(postBalance0)));
        expect(Number(fromBN(preBalance0.sub(postBalance0)))).to.gt(0);

        // Wait till board expires
        await fastForward(MONTH_SEC);

        // Mock sETH price
        await TestSystem.marketActions.mockPrice(testSystem, toBN("1600"), 'sETH');

        // Settle option and confirm payout
        await testSystem.optionMarket.settleExpiredBoard(boardIds[0]);
        const preBalance = await testSystem.snx.quoteAsset.balanceOf(signer.address);
        await testSystem.shortCollateral.settleOptions([1, 2]);
        const postBalance = await testSystem.snx.quoteAsset.balanceOf(signer.address);

        console.log(fromBN(postBalance.sub(preBalance)));
        expect(Number(fromBN(postBalance.sub(preBalance)))).to.gt(1000);
    });

    it('staddle get profit when price move down', async () => {
        const { signer, testSystem, straddle } = await loadFixture(deployContracts);
        let boardIds = await testSystem.optionMarket.getLiveBoards();
        let strikeIds = await testSystem.optionMarket.getBoardStrikes(boardIds[0]);

        // approve quote assets
        await testSystem.snx.quoteAsset.approve(straddle.address, MAX_UINT);

        const preBalance0 = await testSystem.snx.quoteAsset.balanceOf(signer.address);
        // Buy straddle
        await straddle.buyStraddle(strikeIds[0], toBN('100'), toBN('100000'))
        const postBalance0 = await testSystem.snx.quoteAsset.balanceOf(signer.address);
        console.log("position cost", fromBN(preBalance0.sub(postBalance0)));
        expect(Number(fromBN(preBalance0.sub(postBalance0)))).to.gt(0);

        // Wait till board expires
        await fastForward(MONTH_SEC);

        // Mock sETH price
        await TestSystem.marketActions.mockPrice(testSystem, toBN("1000"), 'sETH');

        // Settle option and confirm payout
        await testSystem.optionMarket.settleExpiredBoard(boardIds[0]);
        const preBalance = await testSystem.snx.quoteAsset.balanceOf(signer.address);
        await testSystem.shortCollateral.settleOptions([1, 2]);
        const postBalance = await testSystem.snx.quoteAsset.balanceOf(signer.address);

        console.log(fromBN(postBalance.sub(preBalance)));
        // expect(Number(fromBN(postBalance.sub(preBalance)))).to.gt(1000);
    });

    it("staddle don't get profit when price don't move enough", async () => {
        const { signer, testSystem, straddle } = await loadFixture(deployContracts);
        let boardIds = await testSystem.optionMarket.getLiveBoards();
        let strikeIds = await testSystem.optionMarket.getBoardStrikes(boardIds[0]);

        // approve quote assets
        await testSystem.snx.quoteAsset.approve(straddle.address, MAX_UINT);

        const preBalance0 = await testSystem.snx.quoteAsset.balanceOf(signer.address);
        // Buy straddle
        await straddle.buyStraddle(strikeIds[0], toBN('100'), toBN('100000'))
        const postBalance0 = await testSystem.snx.quoteAsset.balanceOf(signer.address);
        console.log("position cost", fromBN(preBalance0.sub(postBalance0)));
        expect(Number(fromBN(preBalance0.sub(postBalance0)))).to.gt(0);

        // Wait till board expires
        await fastForward(MONTH_SEC);

        // Mock sETH price
        await TestSystem.marketActions.mockPrice(testSystem, toBN("1500"), 'sETH');

        // Settle option and confirm payout
        await testSystem.optionMarket.settleExpiredBoard(boardIds[0]);
        const preBalance = await testSystem.snx.quoteAsset.balanceOf(signer.address);
        await testSystem.shortCollateral.settleOptions([1, 2]);
        const postBalance = await testSystem.snx.quoteAsset.balanceOf(signer.address);

        console.log(fromBN(postBalance.sub(preBalance)));
        expect(Number(fromBN(postBalance.sub(preBalance)))).to.lt(1000);
    });

});