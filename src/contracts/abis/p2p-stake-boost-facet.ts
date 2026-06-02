export const p2pStakeBoostFacetAbi = [
  {
    inputs: [{ internalType: "uint256", name: "tokens", type: "uint256" }],
    name: "p2pBoostStake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokens", type: "uint256" }],
    name: "p2pBoostTopUp",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "p2pBoostRequestUnstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "p2pBoostClaimUnstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserStake",
    outputs: [
      {
        components: [
          { internalType: "uint128", name: "stakedAmount", type: "uint128" },
          { internalType: "uint64", name: "cooldownEnd", type: "uint64" },
          { internalType: "uint8", name: "status", type: "uint8" },
        ],
        internalType: "struct P2PStakeBoostStorage.UserStake",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
