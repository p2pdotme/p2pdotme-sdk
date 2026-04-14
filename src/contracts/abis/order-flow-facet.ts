export const orderFlowFacetAbi = [
	{
		inputs: [
			{ internalType: "uint256", name: "circleId", type: "uint256" },
			{ internalType: "uint256", name: "assignUpto", type: "uint256" },
			{ internalType: "bytes32", name: "currency", type: "bytes32" },
			{ internalType: "address", name: "user", type: "address" },
			{ internalType: "uint256", name: "usdtAmount", type: "uint256" },
			{ internalType: "uint256", name: "fiatAmount", type: "uint256" },
			{ internalType: "int256", name: "orderType", type: "int256" },
			{ internalType: "uint256", name: "preferredPCConfigId", type: "uint256" },
		],
		name: "getAssignableMerchantsFromCircle",
		outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{ internalType: "address", name: "_user", type: "address" },
			{ internalType: "bytes32", name: "_nativeCurrency", type: "bytes32" },
		],
		name: "userTxLimit",
		outputs: [
			{ internalType: "uint256", name: "", type: "uint256" },
			{ internalType: "uint256", name: "", type: "uint256" },
		],
		stateMutability: "view",
		type: "function",
	},
] as const;
