import { errAsync, okAsync, ResultAsync } from "neverthrow";
import type { Account, Chain, Hash, TransactionReceipt, WalletClient } from "viem";
import type { PublicClientLike } from "../types";
import { OrdersError } from "./errors";
import type { PreparedTx, TxResult, TxResultMeta } from "./types";

/**
 * Submits a prepared tx through the consumer's WalletClient and, if requested,
 * waits for its receipt. Maps viem rejections to `TX_SUBMISSION_FAILED`, timeouts
 * to `RECEIPT_TIMEOUT`, and non-success receipts to `TX_REVERTED`.
 */
export function submitPreparedTx(input: {
	readonly prepared: PreparedTx;
	readonly walletClient: WalletClient;
	readonly publicClient: PublicClientLike;
	readonly waitForReceipt?: boolean;
	readonly extraMeta?: TxResultMeta;
}): ResultAsync<TxResult, OrdersError> {
	const { prepared, walletClient, publicClient, waitForReceipt, extraMeta } = input;

	const account = walletClient.account as Account | undefined;
	if (!account) {
		return errAsync(
			new OrdersError("WalletClient is missing an account", {
				code: "TX_SUBMISSION_FAILED",
			}),
		);
	}

	const chain = walletClient.chain as Chain | undefined;

	return ResultAsync.fromPromise(
		walletClient.sendTransaction({
			account,
			chain,
			to: prepared.to,
			data: prepared.data,
			value: prepared.value,
		}),
		(cause) =>
			new OrdersError("walletClient.sendTransaction rejected", {
				code: "TX_SUBMISSION_FAILED",
				cause,
			}),
	).andThen((hash: Hash) => {
		const combinedMeta: TxResultMeta | undefined =
			prepared.meta || extraMeta ? { ...prepared.meta, ...extraMeta } : undefined;

		if (!waitForReceipt) {
			return okAsync<TxResult, OrdersError>({ hash, meta: combinedMeta });
		}

		return ResultAsync.fromPromise(
			(
				publicClient as unknown as {
					waitForTransactionReceipt: (args: { hash: Hash }) => Promise<TransactionReceipt>;
				}
			).waitForTransactionReceipt({ hash }),
			(cause) =>
				new OrdersError("waitForTransactionReceipt failed", {
					code: "RECEIPT_TIMEOUT",
					cause,
				}),
		).andThen((receipt) => {
			if (receipt.status !== "success") {
				return errAsync(
					new OrdersError("Transaction reverted", {
						code: "TX_REVERTED",
						context: { hash, blockNumber: receipt.blockNumber.toString() },
					}),
				);
			}
			return okAsync<TxResult, OrdersError>({ hash, receipt, meta: combinedMeta });
		});
	});
}
