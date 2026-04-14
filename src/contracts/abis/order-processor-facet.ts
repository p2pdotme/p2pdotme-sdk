/**
 * Minimal ABI fragments for reads on OrderProcessor storage via the Diamond.
 * Only `getOrdersById` and `getAdditionalOrderDetails`.
 */
export const orderProcessorFacetAbi = [
	{
		type: "function",
		name: "getOrdersById",
		stateMutability: "view",
		inputs: [{ name: "orderId", type: "uint256" }],
		outputs: [
			{
				type: "tuple",
				components: [
					{ name: "amount", type: "uint256" },
					{ name: "fiatAmount", type: "uint256" },
					{ name: "placedTimestamp", type: "uint256" },
					{ name: "completedTimestamp", type: "uint256" },
					{ name: "userCompletedTimestamp", type: "uint256" },
					{ name: "acceptedMerchant", type: "address" },
					{ name: "user", type: "address" },
					{ name: "recipientAddr", type: "address" },
					{ name: "pubkey", type: "string" },
					{ name: "encUpi", type: "string" },
					{ name: "userCompleted", type: "bool" },
					{ name: "status", type: "uint8" },
					{ name: "orderType", type: "uint8" },
					{
						name: "disputeInfo",
						type: "tuple",
						components: [
							{ name: "raisedBy", type: "uint8" },
							{ name: "status", type: "uint8" },
							{ name: "redactTransId", type: "uint256" },
							{ name: "accountNumber", type: "uint256" },
						],
					},
					{ name: "id", type: "uint256" },
					{ name: "userPubKey", type: "string" },
					{ name: "encMerchantUpi", type: "string" },
					{ name: "acceptedAccountNo", type: "uint256" },
					{ name: "assignedAccountNos", type: "uint256[]" },
					{ name: "currency", type: "bytes32" },
					{ name: "preferredPaymentChannelConfigId", type: "uint256" },
					{ name: "circleId", type: "uint256" },
				],
			},
		],
	},
	{
		type: "function",
		name: "getAdditionalOrderDetails",
		stateMutability: "view",
		inputs: [{ name: "orderId", type: "uint256" }],
		outputs: [
			{
				type: "tuple",
				components: [
					{ name: "fixedFeePaid", type: "uint64" },
					{ name: "tipsPaid", type: "uint64" },
					{ name: "acceptedTimestamp", type: "uint128" },
					{ name: "paidTimestamp", type: "uint128" },
					{ name: "reserved2", type: "uint128" },
					{ name: "actualUsdtAmount", type: "uint256" },
					{ name: "actualFiatAmount", type: "uint256" },
				],
			},
		],
	},
] as const;
