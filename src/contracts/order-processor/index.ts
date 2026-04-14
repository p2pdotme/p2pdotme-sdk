import { ResultAsync } from "neverthrow";
import type { Address, ContractFunctionReturnType } from "viem";
import type { PublicClientLike } from "../../types";
import { ABIS } from "../abis";
import type { orderProcessorFacetAbi } from "../abis/order-processor-facet";

/** Return type of the contract `getOrdersById` function, derived from the ABI. */
export type RawContractOrder = ContractFunctionReturnType<
	typeof orderProcessorFacetAbi,
	"view",
	"getOrdersById"
>;

/** Return type of the contract `getAdditionalOrderDetails` function, derived from the ABI. */
export type RawContractAdditionalDetails = ContractFunctionReturnType<
	typeof orderProcessorFacetAbi,
	"view",
	"getAdditionalOrderDetails"
>;

export interface RawOrderBundle {
	order: RawContractOrder;
	details: RawContractAdditionalDetails;
}

/**
 * Reads the core Order struct and AdditionalOrderDetails for `orderId` from the
 * Diamond. Uses viem `multicall` when available (1 RPC) and falls back to two
 * parallel `readContract` calls otherwise.
 */
export function readOrderMulticall(
	publicClient: PublicClientLike,
	diamondAddress: Address,
	orderId: bigint,
): ResultAsync<RawOrderBundle, Error> {
	const calls = [
		{
			address: diamondAddress,
			abi: ABIS.FACETS.ORDER_PROCESSOR,
			functionName: "getOrdersById",
			args: [orderId] as const,
		},
		{
			address: diamondAddress,
			abi: ABIS.FACETS.ORDER_PROCESSOR,
			functionName: "getAdditionalOrderDetails",
			args: [orderId] as const,
		},
	];

	const toError = (error: unknown) => new Error("Order contract read failed", { cause: error });

	const exec = async (): Promise<RawOrderBundle> => {
		if (publicClient.multicall) {
			const [order, details] = (await publicClient.multicall({
				contracts: calls,
				allowFailure: false,
			})) as [RawContractOrder, RawContractAdditionalDetails];
			return { order, details };
		}
		const [order, details] = (await Promise.all(
			calls.map((c) => publicClient.readContract(c)),
		)) as [RawContractOrder, RawContractAdditionalDetails];
		return { order, details };
	};

	return ResultAsync.fromPromise(exec(), toError);
}
