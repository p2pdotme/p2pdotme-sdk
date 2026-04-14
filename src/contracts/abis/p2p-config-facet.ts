export const p2pConfigFacetAbi = [
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "_currency",
				type: "bytes32",
			},
		],
		name: "getPriceConfig",
		outputs: [
			{
				components: [
					{
						internalType: "uint256",
						name: "buyPrice",
						type: "uint256",
					},
					{
						internalType: "uint256",
						name: "sellPrice",
						type: "uint256",
					},
					{
						internalType: "int256",
						name: "buyPriceOffset",
						type: "int256",
					},
					{
						internalType: "uint256",
						name: "baseSpread",
						type: "uint256",
					},
				],
				internalType: "struct P2pConfigStorage.PriceConfig",
				name: "",
				type: "tuple",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "_nativeCurrency",
				type: "bytes32",
			},
		],
		name: "getRpPerUsdtLimitRational",
		outputs: [
			{
				internalType: "uint256",
				name: "numerator",
				type: "uint256",
			},
			{
				internalType: "uint256",
				name: "denominator",
				type: "uint256",
			},
		],
		stateMutability: "view",
		type: "function",
	},
] as const;
