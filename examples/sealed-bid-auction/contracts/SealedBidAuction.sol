// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract SealedBidAuction is SepoliaConfig {
    address public seller;
    uint256 public biddingEnds;
    bool public finalized;

    struct Bidder {
        euint64 amount;
        bool hasBid;
    }

    mapping(address => Bidder) public bidders;
    address[] public bidderList;

    euint64 public highestBid;
    address public highestBidder;

    constructor(uint256 _durationMinutes) {
        seller = msg.sender;
        biddingEnds = block.timestamp + (_durationMinutes * 1 minutes);
        finalized = false;
    }

    function placeBid(externalEuint64 amount, bytes calldata inputProof) external {
        require(block.timestamp < biddingEnds, "Bidding has ended");
        require(!finalized, "Auction is finalized");
        require(!bidders[msg.sender].hasBid, "Already placed bid");

        euint64 bidAmount = FHE.fromExternal(amount, inputProof);
        FHE.allowThis(bidAmount);
        FHE.allow(bidAmount, msg.sender);

        ebool isFirstBid = FHE.eq(highestBid, FHE.asEuint64(0));

        ebool isNewHighest = FHE.select(
            isFirstBid,
            FHE.asEbool(true),
            FHE.gt(bidAmount, highestBid)
        );

        highestBid = FHE.select(
            isNewHighest,
            bidAmount,
            highestBid
        );
        FHE.allowThis(highestBid);

        bidders[msg.sender].amount = bidAmount;
        bidders[msg.sender].hasBid = true;
        bidderList.push(msg.sender);
    }

    function getMyBid() external view returns (euint64) {
        require(bidders[msg.sender].hasBid, "No bid placed");
        return bidders[msg.sender].amount;
    }

    function finalize() external {
        require(block.timestamp >= biddingEnds, "Bidding still active");
        require(!finalized, "Already finalized");
        finalized = true;
    }

    function getHighestBid() external view returns (euint64) {
        require(finalized, "Auction not finalized");
        return highestBid;
    }

    function getBidderCount() external view returns (uint256) {
        return bidderList.length;
    }
}
