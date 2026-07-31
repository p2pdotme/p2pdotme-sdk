import { FraudEngineError } from "./errors";
import type { FraudEngineSigner } from "./types";

export async function getSignedHeaders(
	signer: FraudEngineSigner,
	action: "activity-log" | "link-order" | "fingerprint-log",
): Promise<Record<string, string>> {
	// The signed message binds BOTH addresses: the key that produces the
	// signature (the admin EOA for AA smart wallets) and the subject the
	// request acts for (the smart account). Binding the subject stops a
	// signature captured for one account being replayed against another
	// inside the backend's freshness window.
	//
	// This is not by itself an authorisation control — the backend decides
	// entitlement by checking on-chain that the signer is an admin of the
	// subject account. See fraud-engine `core/wallet_auth.py`.
	//
	// For plain EOA signers where no separate `signerAddress` is provided,
	// both values collapse to `signer.address`.
	const signingAddress = (signer.signerAddress ?? signer.address).toLowerCase();
	const subjectAddress = signer.address.toLowerCase();
	const timestamp = Math.floor(Date.now() / 1000).toString();
	const message = `${action}:${signingAddress}:${subjectAddress}:${timestamp}`;

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
