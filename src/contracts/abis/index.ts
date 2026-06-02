import { erc20Abi } from "viem";
import { orderFlowFacetAbi } from "./order-flow-facet";
import { orderProcessorFacetAbi } from "./order-processor-facet";
import { p2pConfigFacetAbi } from "./p2p-config-facet";
import { p2pStakeBoostFacetAbi } from "./p2p-stake-boost-facet";
import { reputationManagerAbi } from "./reputation-manager";

const DIAMOND_ABI = [
	...orderFlowFacetAbi,
	...orderProcessorFacetAbi,
	...p2pConfigFacetAbi,
	...p2pStakeBoostFacetAbi,
] as const;

export const ABIS = {
	DIAMOND: DIAMOND_ABI,
	FACETS: {
		ORDER_FLOW: orderFlowFacetAbi,
		ORDER_PROCESSOR: orderProcessorFacetAbi,
		CONFIG: p2pConfigFacetAbi,
		STAKE: p2pStakeBoostFacetAbi,
	},
	EXTERNAL: {
		USDC: erc20Abi,
		REPUTATION_MANAGER: reputationManagerAbi,
	},
} as const;
