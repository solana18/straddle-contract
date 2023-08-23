//SPDX-License-Identifier: ISC

pragma solidity 0.8.16;

import "./LyraAdapter.sol";
import "openzeppelin-contracts-4.4.1/token/ERC20/IERC20.sol";

contract StraddleTest is LyraAdapterNew {
    event StraddleResult(
        uint positionId1,
        uint positionId2,
        uint totalCost,
        uint totalFee
    );

    function buyStraddle(uint _strikeId, uint _amount, uint _maxCost) external {
        uint beforeBalance = IERC20(quoteAsset).balanceOf(address(this));
        IERC20(quoteAsset).transferFrom(msg.sender, address(this), _maxCost);

        TradeInputParameters memory paramsCall = TradeInputParameters({
            strikeId: _strikeId,
            positionId: 0,
            iterations: 1,
            optionType: OptionType.LONG_CALL,
            amount: _amount,
            setCollateralTo: 0,
            minTotalCost: 0,
            maxTotalCost: _maxCost,
            rewardRecipient: address(0)
        });
        TradeResult memory longCallResult = _openPosition(paramsCall);
        optionToken.transferFrom(
            address(this),
            msg.sender,
            longCallResult.positionId
        );

        TradeInputParameters memory paramsPut = TradeInputParameters({
            strikeId: _strikeId,
            positionId: 0,
            amount: _amount,
            setCollateralTo: 0,
            iterations: 1,
            minTotalCost: 0,
            maxTotalCost: type(uint128).max,
            optionType: OptionType.LONG_PUT,
            rewardRecipient: address(0)
        });
        TradeResult memory putCallResult = _openPosition(paramsPut);
        optionToken.transferFrom(
            address(this),
            msg.sender,
            putCallResult.positionId
        );

        uint afterBalance = IERC20(quoteAsset).balanceOf(address(this));
        require(afterBalance >= beforeBalance, "Position cost is not enough");
        IERC20(quoteAsset).transfer(msg.sender, afterBalance - beforeBalance);

        emit StraddleResult(
            longCallResult.positionId,
            putCallResult.positionId,
            longCallResult.totalCost + putCallResult.totalCost,
            longCallResult.totalFee + putCallResult.totalFee
        );
    }
}
