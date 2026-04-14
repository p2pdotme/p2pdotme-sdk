import { erc20Abi } from "viem";
import { orderFlowFacetAbi } from "./order-flow-facet";
import { p2pConfigFacetAbi } from "./p2p-config-facet";
import { reputationManagerAbi } from "./reputation-manager";

const DIAMOND_ABI = [...orderFlowFacetAbi, ...p2pConfigFacetAbi] as const;

export const ABIS = {
	DIAMOND: DIAMOND_ABI,
	FACETS: {
		ORDER_FLOW: orderFlowFacetAbi,
		CONFIG: p2pConfigFacetAbi,
	},
	EXTERNAL: {
		USDC: erc20Abi,
		REPUTATION_MANAGER: reputationManagerAbi,
	},
} as const;
