// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8, euint32 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract ConfidentialVoting is SepoliaConfig {
    struct Candidate {
        string name;
        euint32 voteCount;
    }

    string[] public candidateNames;
    mapping(uint256 => euint32) public voteCounts;
    mapping(address => bool) public hasVoted;
    uint256 public candidateCount;
    bool public votingEnded;

    constructor(string[] memory _candidates) {
        candidateCount = _candidates.length;
        for (uint256 i = 0; i < _candidates.length; i++) {
            candidateNames.push(_candidates[i]);
            voteCounts[i] = FHE.asEuint32(0);
            FHE.allowThis(voteCounts[i]);
        }
    }

    function vote(externalEuint8 choice, bytes calldata inputProof) external {
        require(!votingEnded, "Voting has ended");
        require(!hasVoted[msg.sender], "Already voted");

        euint8 voteChoice = FHE.fromExternal(choice, inputProof);
        FHE.allowThis(voteChoice);
        FHE.allow(voteChoice, msg.sender);

        uint256 index = FHE.decrypt(voteChoice);
        require(index < candidateCount, "Invalid candidate");

        voteCounts[index] = FHE.add(voteCounts[index], FHE.asEuint32(1));
        FHE.allowThis(voteCounts[index]);

        hasVoted[msg.sender] = true;
    }

    function endVoting() external {
        votingEnded = true;
    }

    function getVoteCount(uint256 candidateIndex) external view returns (euint32) {
        require(candidateIndex < candidateCount, "Invalid candidate");
        return voteCounts[candidateIndex];
    }

    function getCandidateName(uint256 candidateIndex) external view returns (string memory) {
        require(candidateIndex < candidateCount, "Invalid candidate");
        return candidateNames[candidateIndex];
    }
}
