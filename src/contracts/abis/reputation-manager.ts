export const reputationManagerAbi = [
	{
		inputs: [
			{
				internalType: "string",
				name: "_socialName",
				type: "string",
			},
			{
				components: [
					{
						components: [
							{
								internalType: "string",
								name: "provider",
								type: "string",
							},
							{
								internalType: "string",
								name: "parameters",
								type: "string",
							},
							{
								internalType: "string",
								name: "context",
								type: "string",
							},
						],
						internalType: "struct IReclaimSDK.ClaimInfo",
						name: "claimInfo",
						type: "tuple",
					},
					{
						components: [
							{
								components: [
									{
										internalType: "bytes32",
										name: "identifier",
										type: "bytes32",
									},
									{
										internalType: "address",
										name: "owner",
										type: "address",
									},
									{
										internalType: "uint32",
										name: "timestampS",
										type: "uint32",
									},
									{
										internalType: "uint32",
										name: "epoch",
										type: "uint32",
									},
								],
								internalType: "struct IReclaimSDK.CompleteClaimData",
								name: "claim",
								type: "tuple",
							},
							{
								internalType: "bytes[]",
								name: "signatures",
								type: "bytes[]",
							},
						],
						internalType: "struct IReclaimSDK.SignedClaim",
						name: "signedClaim",
						type: "tuple",
					},
				],
				internalType: "struct IReclaimSDK.Proof[]",
				name: "proofs",
				type: "tuple[]",
			},
		],
		name: "socialVerify",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "uint256",
				name: "nullifierSeed",
				type: "uint256",
			},
			{
				internalType: "uint256",
				name: "nullifier",
				type: "uint256",
			},
			{
				internalType: "uint256",
				name: "timestamp",
				type: "uint256",
			},
			{
				internalType: "uint256",
				name: "signal",
				type: "uint256",
			},
			{
				internalType: "uint256[4]",
				name: "revealArray",
				type: "uint256[4]",
			},
			{
				internalType: "uint256[8]",
				name: "groth16Proof",
				type: "uint256[8]",
			},
		],
		name: "submitAnonAadharProof",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: "bytes32",
						name: "version",
						type: "bytes32",
					},
					{
						components: [
							{
								internalType: "bytes32",
								name: "vkeyHash",
								type: "bytes32",
							},
							{
								internalType: "bytes",
								name: "proof",
								type: "bytes",
							},
							{
								internalType: "bytes32[]",
								name: "publicInputs",
								type: "bytes32[]",
							},
						],
						internalType: "struct ProofVerificationData",
						name: "proofVerificationData",
						type: "tuple",
					},
					{
						internalType: "bytes",
						name: "committedInputs",
						type: "bytes",
					},
					{
						components: [
							{
								internalType: "uint256",
								name: "validityPeriodInSeconds",
								type: "uint256",
							},
							{
								internalType: "string",
								name: "domain",
								type: "string",
							},
							{
								internalType: "string",
								name: "scope",
								type: "string",
							},
							{
								internalType: "bool",
								name: "devMode",
								type: "bool",
							},
						],
						internalType: "struct ServiceConfig",
						name: "serviceConfig",
						type: "tuple",
					},
				],
				internalType: "struct ProofVerificationParams",
				name: "params",
				type: "tuple",
			},
			{
				internalType: "bool",
				name: "isIDCard",
				type: "bool",
			},
		],
		name: "zkPassportRegister",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
] as const;
