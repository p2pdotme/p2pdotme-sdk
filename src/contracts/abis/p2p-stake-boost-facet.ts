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
		inputs: [],
		name: "p2pBoostCancelUnstake",
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
	{
		inputs: [{ internalType: "bytes32", name: "currency", type: "bytes32" }],
		name: "getStakeBoostConfig",
		outputs: [
			{
				components: [
					{
						internalType: "uint256",
						name: "tokensPerUsdNumerator",
						type: "uint256",
					},
					{
						internalType: "uint256",
						name: "tokensPerUsdDenominator",
						type: "uint256",
					},
					{ internalType: "uint256", name: "maxBoostUsd", type: "uint256" },
				],
				internalType: "struct P2PStakeBoostStorage.BoostConfig",
				name: "",
				type: "tuple",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "getStakeBoostGlobals",
		outputs: [
			{ internalType: "address", name: "p2pToken", type: "address" },
			{ internalType: "address", name: "fraudReserve", type: "address" },
			{ internalType: "uint256", name: "maxStakeTokens", type: "uint256" },
			{ internalType: "uint256", name: "normalCooldown", type: "uint256" },
			{ internalType: "uint256", name: "blacklistCooldown", type: "uint256" },
			{ internalType: "uint8", name: "tokenDecimals", type: "uint8" },
			{ internalType: "uint256", name: "totalStaked", type: "uint256" },
		],
		stateMutability: "view",
		type: "function",
	},
] as const;
