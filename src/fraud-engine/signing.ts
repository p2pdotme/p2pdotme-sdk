import { FraudEngineError } from "./errors";
import type { FraudEngineSigner } from "./types";

export async function getSignedHeaders(
	signer: FraudEngineSigner,
	action: "activity-log" | "link-order" | "fingerprint-log",
): Promise<Record<string, string>> {
	// The EIP-191 signed message is bound to the address of the key that
	// actually produces the signature (the admin EOA for AA smart wallets),
	// not to the tracked subject address. For plain EOA signers where no
	// separate `signerAddress` is provided, this falls back to `signer.address`
	// and behaviour is identical to the single-address case.
	const signingAddress = (signer.signerAddress ?? signer.address).toLowerCase();
	const timestamp = Math.floor(Date.now() / 1000).toString();
	const message = `${action}:${signingAddress}:${timestamp}`;

	try {
		const signature = await signer.signMessage(message);
		return {
			"X-Signer-Address": signingAddress,
			"X-Timestamp": timestamp,
			"X-Signature": signature,
		};
	} catch (cause) {
		throw new FraudEngineError("Failed to sign message", {
			code: "SIGNING_ERROR",
			cause,
		});
	}
}
