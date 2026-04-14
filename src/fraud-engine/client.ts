import { errAsync, ResultAsync } from "neverthrow";
import { type Logger, noopLogger } from "../lib";
import { getDeviceDetails } from "./device";
import { encryptPayload } from "./encryption";
import { FraudEngineError } from "./errors";
import { getFingerprint as getFingerprintResult, loadFingerprintAgent } from "./fingerprint";
import { cleanupSeonStorage as cleanupSeon, getSeonSession, initSeon } from "./seon";
import { getSignedHeaders } from "./signing";
import type {
	BuyOrderDetails,
	FingerprintLogResult,
	FraudCheckApiResponse,
	FraudCheckResult,
	FraudEngine,
	FraudEngineConfig,
	FraudEngineSigner,
	LinkOrderResult,
	ProcessBuyOrderResult,
	UserDetails,
} from "./types";
import { validate, ZodFraudEngineConfigSchema } from "./validation";

export function createFraudEngine(config: FraudEngineConfig): FraudEngine {
	const { apiUrl, encryptionKey } = config;
	const seonRegion = config.seonRegion ?? "asia";
	const logger: Logger = config.logger ?? noopLogger;

	// Validate eagerly so misconfiguration surfaces at construction time, but
	// never throw — the SDK's contract is that all failures flow through
	// `Result`/`ResultAsync`. Capture the error and short-circuit any method
	// that depends on the validated fields (`apiUrl`, `encryptionKey`).
	// Methods that don't depend on them (init, getFingerprint, getDeviceDetails,
	// cleanupSeonStorage) remain usable so consumers can still hydrate device
	// fingerprints even with a partially-configured engine.
	const configResult = validate(ZodFraudEngineConfigSchema, {
		apiUrl,
		encryptionKey,
		seonRegion,
	});
	const configError = configResult.isErr() ? configResult.error : null;
	if (configError) {
		logger.error(
			"Fraud engine config invalid; API methods will return VALIDATION_ERROR until fixed",
			{ error: configError.message },
		);
	}

	function linkOrderInternal(
		signer: FraudEngineSigner,
		activityLogId: number,
		orderId: string,
	): ResultAsync<LinkOrderResult, FraudEngineError> {
		return ResultAsync.fromPromise(
			(async () => {
				logger.info("Linking order to activity log", { activityLogId, orderId });

				const signedHeaders = await getSignedHeaders(signer, "link-order");

				const response = await fetch(`${apiUrl}/activity-logs/link-order`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						...signedHeaders,
					},
					body: JSON.stringify({
						activity_log_id: activityLogId,
						order_id: orderId,
						user_address: signer.address.toLowerCase(),
					}),
				});

				if (!response.ok) {
					throw new FraudEngineError(`Link order API returned ${response.status}`, {
						code: "API_ERROR",
						context: { status: response.status },
					});
				}

				const data = (await response.json()) as LinkOrderResult;
				logger.info("Order linked successfully", { orderId });
				return data;
			})(),
			(cause) => {
				if (cause instanceof FraudEngineError) return cause;
				return new FraudEngineError("Link order failed", {
					code: "NETWORK_ERROR",
					cause,
				});
			},
		);
	}

	async function checkBuyOrderInternal(params: {
		signer: FraudEngineSigner;
		orderDetails: BuyOrderDetails;
		userDetails?: UserDetails;
		orderSource?: string;
	}): Promise<FraudCheckApiResponse> {
		logger.info("Checking buy order for fraud", {
			currency: params.orderDetails.currency,
			fiatAmount: params.orderDetails.fiatAmount,
		});

		const [seonSession, deviceDetails, signedHeaders] = await Promise.all([
			getSeonSession(seonRegion),
			getDeviceDetails(),
			getSignedHeaders(params.signer, "activity-log"),
		]);

		const device = { ...deviceDetails, seonSession };

		const userAddress = params.signer.address.toLowerCase();
		const timestamp = Date.now();

		const payload = JSON.stringify({
			user_details: {
				currency: params.userDetails?.currency,
				country: params.userDetails?.country,
				language: params.userDetails?.language,
				login_method: params.userDetails?.loginMethod,
				login_email: params.userDetails?.loginEmail,
				login_phone: params.userDetails?.loginPhone,
			},
			transaction_details: {
				crypto_amount: params.orderDetails.cryptoAmount,
				fiat_amount: params.orderDetails.fiatAmount,
				currency: params.orderDetails.currency,
				recipient_address: params.orderDetails.recipientAddress,
				fee: params.orderDetails.fee,
				amount_after_fee: params.orderDetails.amountAfterFee,
				payment_method: params.orderDetails.paymentMethod,
				estimated_processing_time: params.orderDetails.estimatedProcessingTime,
				order_timestamp: timestamp,
				order_source: params.orderSource,
			},
			device_details: device,
		});

		// AAD format must match backend: "type|user_address|timestamp"
		const aad = `buy_order|${userAddress}|${timestamp}`;
		const encrypted = await encryptPayload(payload, aad, encryptionKey);

		const response = await fetch(`${apiUrl}/activity-logs`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...signedHeaders,
			},
			body: JSON.stringify({
				type: "buy_order",
				user_address: userAddress,
				timestamp,
				encrypted_payload: encrypted,
			}),
		});

		if (!response.ok) {
			throw new FraudEngineError(`Fraud check API returned ${response.status}`, {
				code: "API_ERROR",
				context: { status: response.status },
			});
		}

		const data = (await response.json()) as FraudCheckApiResponse;
		logger.info("Fraud check result", {
			approved: data.approved,
			activityLogId: data.activity_log_id,
		});
		return data;
	}

	return {
		async init() {
			logger.info("Initializing fraud engine");
			try {
				initSeon();
			} catch (cause) {
				logger.error("SEON initialization failed", { cause: String(cause) });
			}
			try {
				await loadFingerprintAgent();
			} catch (cause) {
				logger.error("FingerprintJS initialization failed", {
					cause: String(cause),
				});
			}
			logger.info("Fraud engine initialized");
		},

		checkBuyOrder(params: {
			signer: FraudEngineSigner;
			orderDetails: BuyOrderDetails;
			userDetails?: UserDetails;
			orderSource?: string;
		}): ResultAsync<FraudCheckResult, FraudEngineError> {
			if (configError) return errAsync(configError);
			return ResultAsync.fromPromise(
				checkBuyOrderInternal(params).then((data) => ({
					approved: data.approved,
					activityLogId: data.activity_log_id,
					message: data.message,
					linkOrder: (orderId: string) =>
						linkOrderInternal(params.signer, data.activity_log_id, orderId),
				})),
				(cause) => {
					if (cause instanceof FraudEngineError) return cause;
					return new FraudEngineError("Fraud check failed", {
						code: "NETWORK_ERROR",
						cause,
					});
				},
			);
		},

		processBuyOrder(params: {
			signer: FraudEngineSigner;
			orderDetails: BuyOrderDetails;
			userDetails?: UserDetails;
			orderSource?: string;
			placeOrder: () => Promise<string>;
		}): ResultAsync<ProcessBuyOrderResult, FraudEngineError> {
			if (configError) return errAsync(configError);
			return ResultAsync.fromPromise(
				(async () => {
					let activityLogId: number | null = null;

					// Step 1: Fraud check (fail-open)
					try {
						const fraudCheck = await checkBuyOrderInternal(params);
						if (!fraudCheck.approved) {
							return { status: "rejected" as const, message: fraudCheck.message };
						}
						activityLogId = fraudCheck.activity_log_id;
					} catch (cause) {
						logger.error("Fraud check failed, proceeding with order (fail-open)", {
							error: String(cause),
						});
					}

					// Step 2: Place order (consumer callback)
					let orderId: string;
					try {
						orderId = await params.placeOrder();
					} catch (cause) {
						throw new FraudEngineError("Place order callback failed", {
							code: "PLACE_ORDER_ERROR",
							cause,
						});
					}

					// Step 3: Auto-link (fire-and-forget, only if fraud check succeeded)
					if (activityLogId !== null) {
						linkOrderInternal(params.signer, activityLogId, orderId).mapErr((e) => {
							logger.error("Failed to link order to activity log", {
								orderId,
								activityLogId: activityLogId as number,
								error: e.message,
							});
						});
					}

					return { status: "placed" as const, orderId };
				})(),
				(cause) => {
					if (cause instanceof FraudEngineError) return cause;
					return new FraudEngineError("Process buy order failed", {
						code: "NETWORK_ERROR",
						cause,
					});
				},
			);
		},

		logFingerprint(params: {
			signer: FraudEngineSigner;
		}): ResultAsync<FingerprintLogResult | null, FraudEngineError> {
			if (configError) return errAsync(configError);
			return ResultAsync.fromPromise(
				(async () => {
					logger.info("Logging fingerprint");

					const fingerprintResult = await getFingerprintResult(5000);
					if (!fingerprintResult) {
						logger.warn("Fingerprint not available, skipping");
						return null;
					}

					const signedHeaders = await getSignedHeaders(params.signer, "fingerprint-log");

					const normalizedAddress = params.signer.address.toLowerCase();
					const timestamp = Date.now();

					const payload = JSON.stringify({
						fingerprint_id: fingerprintResult.visitorId,
					});

					// AAD format: "fingerprint|user_address|timestamp"
					const aad = `fingerprint|${normalizedAddress}|${timestamp}`;
					const encrypted = await encryptPayload(payload, aad, encryptionKey);

					const response = await fetch(`${apiUrl}/fingerprint-log`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...signedHeaders,
						},
						body: JSON.stringify({
							user_address: normalizedAddress,
							timestamp,
							encrypted_payload: encrypted,
						}),
					});

					if (!response.ok) {
						throw new FraudEngineError(`Fingerprint log API returned ${response.status}`, {
							code: "API_ERROR",
							context: { status: response.status },
						});
					}

					const data = (await response.json()) as FingerprintLogResult;
					logger.info("Fingerprint logged successfully");
					return data;
				})(),
				(cause) => {
					if (cause instanceof FraudEngineError) return cause;
					return new FraudEngineError("Fingerprint log failed", {
						code: "NETWORK_ERROR",
						cause,
					});
				},
			);
		},

		async getFingerprint() {
			return getFingerprintResult(5000);
		},

		async getDeviceDetails() {
			return getDeviceDetails();
		},

		cleanupSeonStorage() {
			cleanupSeon();
		},
	};
}
