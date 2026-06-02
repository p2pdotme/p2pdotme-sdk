import { errAsync, okAsync, ResultAsync } from "neverthrow";
import type { Account, Chain, Hash, TransactionReceipt, WalletClient } from "viem";
import type { PublicClientLike } from "../types";
import { StakeError } from "./errors";
import type { PreparedTx, TxResult } from "./types";

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
}): ResultAsync<TxResult, StakeError> {
	const { prepared, walletClient, publicClient, waitForReceipt } = input;

	const account = walletClient.account as Account | undefined;
	if (!account) {
		return errAsync(
			new StakeError("WalletClient is missing an account", {
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
			new StakeError("walletClient.sendTransaction rejected", {
				code: "TX_SUBMISSION_FAILED",
				cause,
			}),
	).andThen((hash: Hash) => {
		if (!waitForReceipt) {
			return okAsync<TxResult, StakeError>({ hash });
		}

		return ResultAsync.fromPromise(
			(
				publicClient as unknown as {
					waitForTransactionReceipt: (args: { hash: Hash }) => Promise<TransactionReceipt>;
				}
			).waitForTransactionReceipt({ hash }),
			(cause) =>
				new StakeError("waitForTransactionReceipt failed", {
					code: "RECEIPT_TIMEOUT",
					cause,
				}),
		).andThen((receipt) => {
			if (receipt.status !== "success") {
				return errAsync(
					new StakeError("Transaction reverted", {
						code: "TX_REVERTED",
						context: { hash, blockNumber: receipt.blockNumber.toString() },
					}),
				);
			}
			return okAsync<TxResult, StakeError>({ hash, receipt });
		});
	});
}
