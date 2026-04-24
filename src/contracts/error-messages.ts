import type { ContractErrorCode } from "./errors";

/**
 * English UI strings for every contract error code.
 * Pass a `ContractErrorCode` to `getContractErrorMessage` to get a
 * human-readable string safe to display directly in the UI.
 */
export const contractErrorMessages: Record<ContractErrorCode, string> = {
	// Access control
	NOT_ADMIN: "You are not an admin",
	NOT_SUPER_ADMIN: "You are not a super admin",
	NOT_AUTHORIZED: "Not authorized",
	NOT_SELF: "Action can only be performed by yourself",
	NOT_WHITELISTED: "Not whitelisted",
	NOT_CIRCLE_ADMIN: "You are not a circle admin",

	// Circle / community management
	INVALID_NAME: "Invalid name",
	INVALID_COMMUNITY_URL: "Invalid community URL",
	INVALID_ADMIN_COMMUNITY_URL: "Invalid admin community URL",
	ADMIN_ALREADY_HAS_CIRCLE: "Admin already has a circle",
	CIRCLE_NAME_ALREADY_TAKEN: "Circle name is already taken",
	P2P_STAKE_CONFIG_NOT_SET: "P2P stake config is not set",
	INSUFFICIENT_P2P_STAKE: "Insufficient P2P stake",
	P2P_TOKEN_NOT_SET: "P2P token is not set",
	P2P_UNSTAKE_REQUEST_PENDING: "A P2P unstake request is already pending",
	NO_P2P_UNSTAKE_REQUEST: "No P2P unstake request found",
	P2P_UNSTAKE_COOLDOWN_NOT_PASSED: "P2P unstake cooldown period has not passed",
	SLASH_AMOUNT_EXCEEDS_STAKE: "Slash amount exceeds stake",
	CIRCLE_NOT_ACTIVE: "Circle is not active",
	INVALID_CIRCLE_ID: "Invalid circle ID",
	CURRENCY_MISMATCH: "Currency mismatch",
	CIRCLE_FULL: "Circle is full",
	CIRCLE_ID_MISMATCH: "Circle ID mismatch",
	DUPLICATE_ACCOUNT_NAME: "Account name already exists",
	EMPTY_NAME: "Name cannot be empty",
	ACCOUNT_BOUND_TO_ANOTHER_CIRCLE: "Account is bound to another circle",
	EXIT_AMOUNT_EXCEEDED_CIRCLE_BALANCE: "Exit amount exceeded circle balance",
	UNDELEGATION_AMOUNT_TOO_HIGH: "Undelegation amount is too high",

	// Exchange / order lifecycle
	EXCHANGE_NOT_OPERATIONAL: "Exchange is not operational",
	ORDER_NOT_PLACED: "Order not placed",
	ORDER_NOT_PAID: "Order has not been paid",
	ORDER_STATUS_INVALID: "Order with placed status only can be re-assigned",
	ORDER_EXPIRED: "Order expired",
	ORDER_ALREADY_PAID: "Payment address already sent",
	ORDER_ALREADY_COMPLETED: "Order already marked completed",
	INVALID_ORDER_TYPE: "Invalid order type",
	ORDER_TYPE_INCORRECT: "Incorrect order type",
	ORDER_NOT_ACCEPTED: "Order not placed to be accepted",
	ORDER_NOT_ASSIGNED: "Order not assigned",
	ORDER_AMOUNT_EXCEEDS_LIMIT: "Order amount exceeds limit",
	INVALID_ORDER_AMOUNT: "Invalid order amount",
	INVALID_ORDER_AMOUNT_TO_COVER_FEE: "Order amount is not enough to cover fee",
	INVALID_ORDER_ID: "Invalid order ID",
	ORDER_TOO_EARLY_FOR_REASSIGNMENT: "Order is too early for reassignment",
	ORDER_TOO_LATE_FOR_REASSIGNMENT: "Order is too late for reassignment",
	REASSIGNMENT_NOT_REQUIRED: "Reassignment is not required",
	TIP_ALREADY_GIVEN: "Tip already given",
	CASHBACK_TRANSFER_FAILED: "Cashback transfer failed",

	// Order limits
	DAILY_BUY_ORDER_LIMIT_EXCEEDED: "Daily buy order count limit exceeded",
	MONTHLY_BUY_ORDER_LIMIT_EXCEEDED: "Monthly buy order count limit exceeded",
	SELL_ORDER_AMOUNT_LIMIT_EXCEEDED: "Sell order amount limit exceeded",
	BUY_ORDER_AMOUNT_EXCEEDS_LIMIT: "Buy order amount exceeds limit",
	SELL_ORDER_AMOUNT_EXCEEDS_LIMIT: "Sell order amount exceeds limit",
	BUY_AMOUNT_EXCEEDS_USDC_LIMIT: "Buy amount exceeds USDC limit",
	SELL_AMOUNT_EXCEEDS_FIAT_LIMIT: "Sell amount exceeds fiat limit",
	DAILY_VOLUME_LIMIT_EXCEEDED: "Daily volume limit exceeded",
	MONTHLY_VOLUME_LIMIT_EXCEEDED: "Monthly volume limit exceeded",
	USER_YEARLY_VOLUME_LIMIT_EXCEEDED: "Yearly volume limit exceeded",

	// Dispute
	DISPUTE_TIME_NOT_REACHED: "Dispute can only be raised after 30 minutes of order placement",
	DISPUTE_TIME_EXPIRED: "Dispute can only be raised after 24 hours of order placement",
	INVALID_ORDER_STATUS_TO_RAISE_DISPUTE: "Invalid order status to raise dispute",
	DISPUTE_NOT_RAISED: "Dispute not raised",
	CANNOT_RAISE_DISPUTE_TWICE: "Cannot raise dispute twice",
	DISPUTE_ALREADY_SETTLED: "Dispute already settled",
	TRANSACTION_ID_MISMATCH: "Transaction ID does not match",
	ACCOUNT_NUMBER_MISMATCH: "Account number does not match",
	NOT_PAID_BUY_ORDER: "Not a paid buy order",

	// Payment channels
	PAYMENT_CHANNEL_NOT_FOUND: "Payment channel not found",
	PAYMENT_CHANNEL_NOT_ACTIVE: "Payment channel not active",
	PAYMENT_CHANNEL_NOT_APPROVED: "Payment channel not approved",
	PAYMENT_CHANNEL_NOT_REJECTED: "Payment channel has not been rejected",
	INVALID_PAYMENT_CHANNEL_ID: "Invalid payment channel ID",
	DUPLICATE_PAYMENT_CHANNEL: "Duplicate payment channel",
	OLD_PAYMENT_CHANNEL_NOT_FOUND: "Old payment channel not found",
	NEW_PAYMENT_CHANNEL_NOT_FOUND: "New payment channel not found",
	SAME_PAYMENT_CHANNEL: "Old and new payment channels are the same",
	OLD_PAYMENT_CHANNEL_SHOULD_BE_INACTIVE: "Old payment channel should be inactive",
	NEW_PAYMENT_CHANNEL_SHOULD_BE_ACTIVE: "New payment channel should be active",
	ONGOING_ORDER_ON_PAYMENT_CHANNEL: "There is an ongoing order on this payment channel",
	UPI_ALREADY_SENT: "Payment address already sent",
	INVALID_ORDER_UPI: "Invalid order payment address",
	NO_FIAT_LIQUIDITY: "No fiat liquidity on exchange to complete order",

	// Merchant
	NOT_ENOUGH_ELIGIBLE_MERCHANTS: "Not enough eligible merchants",
	MERCHANT_NOT_REGISTERED: "Merchant is not registered",
	MERCHANT_NOT_APPROVED: "Merchant is not approved",
	MERCHANT_ALREADY_REGISTERED: "Merchant already registered",
	MERCHANT_ALREADY_REJECTED: "Merchant already rejected",
	MERCHANT_BLACKLISTED: "Merchant blacklisted",
	MERCHANT_NOT_BLACKLISTED: "Merchant not blacklisted",
	MERCHANT_ALREADY_BLACKLISTED: "Merchant already blacklisted",
	MERCHANT_HAS_ONGOING_ORDERS: "Merchant has ongoing orders",
	MERCHANT_NOT_FULLFILLED_ELIGIBILITY_THRESHOLD: "Merchant has not fulfilled eligibility threshold",
	INVALID_MERCHANT: "Invalid merchant",

	// Staking / unstaking
	STAKE_AMOUNT_TOO_LOW: "Stake amount is too low",
	ADDITIONAL_STAKE_NOT_ALLOWED: "Additional stake is not allowed",
	UNSTAKE_REQUEST_PENDING: "Unstake request is already pending",
	UNSTAKE_REQUEST_NOT_PENDING: "No pending unstake request",
	UNSTAKE_AMOUNT_EXCEEDED: "Unstake amount exceeded",
	ZERO_UNSTAKE_AMOUNT: "Unstake amount cannot be zero",
	NO_WITHDRAWABLE_AMOUNT: "No withdrawable amount",
	NO_STAKE: "No stake found",
	NO_STAKERS: "No stakers found",
	INSUFFICIENT_STAKED_AMOUNT: "Insufficient staked amount",
	COOLDOWN_NOT_PASSED: "Cooldown period has not passed",
	CLAIMABLE_REWARDS_NOT_AVAILABLE: "No rewards to claim",

	// Delegation
	EXIT_WOULD_BREACH_DELEGATION_INVARIANT: "Exit would breach delegation invariant",
	AGGREGATE_DELEGATION_EXCEEDS_TOTAL_STAKED: "Aggregate delegation exceeds total staked",
	INSUFFICIENT_MERCHANT_REWARDS: "Insufficient merchant rewards",

	// Migration
	INVALID_MIGRATION_STATUS: "Invalid migration status",
	MIGRATION_REQUEST_NOT_PENDING: "No pending migration request",
	MIGRATION_ALREADY_REQUESTED: "Migration already requested",

	// Token / currency
	TOKEN_ALREADY_EXISTS: "Token already exists",
	TOKEN_NOT_FOUND: "Token not found",
	TOKEN_EMPTY: "Token is empty",
	CURRENCY_NOT_SUPPORTED: "Currency not supported",
	INVALID_CURRENCY: "Invalid currency",

	// USDC / transfer
	USDC_TRANSFER_FAILED: "USDC transfer failed",
	USDC_TRANSFER_FAILED_WITH_ERROR_MESSAGE: "USDC transfer failed with error message",
	USDC_TRANSFER_FAILED_WITH_PANIC: "USDC transfer failed with panic",
	INSUFFICIENT_ALLOWANCE: "Insufficient USDC allowance",

	// ZK Passport
	ZK_PASSPORT_VERIFIER_NOT_SET: "ZK Passport verifier not set",
	ZK_PASSPORT_DOMAIN_EMPTY: "ZK Passport domain is empty",
	ZK_PASSPORT_SCOPE_EMPTY: "ZK Passport scope is empty",
	PASSPORT_ALREADY_VERIFIED: "Passport already verified",
	ZK_PASSPORT_PROOF_INVALID: "ZK Passport proof is invalid",
	ZK_PASSPORT_IDENTIFIER_ALREADY_VERIFIED: "ZK Passport identifier already verified",
	ZK_PASSPORT_INVALID_SCOPE: "ZK Passport invalid scope",
	ZK_PASSPORT_UNEXPECTED_SENDER: "ZK Passport unexpected sender",
	ZK_PASSPORT_AGE_BELOW_MINIMUM: "ZK Passport age below minimum",
	ZK_PASSPORT_MIN_AGE_TOO_HIGH: "ZK Passport minimum age too high",

	// Chainlink / oracle
	UNEXPECTED_REQUEST_ID: "Unexpected request ID",
	ONLY_ROUTER_CAN_FULFILL: "Only the router can fulfill this request",
	REQUEST_FAILED: "Request failed",
	SOURCE_CODE_MISMATCH: "Source code mismatch",
	ZERO_MARKET_PRICE: "Market price cannot be zero",
	INVALID_COMPUTED_PRICES: "Invalid computed prices",
	NOT_PRICE_UPDATER_FOR_CURRENCY: "Not the price updater for this currency",
	THRESHOLD_NOT_CONFIGURED: "Threshold not configured",
	SLIPPAGE_EXCEEDED: "Slippage exceeded",

	// Reputation / verification
	USER_HAS_NO_REPUTATION:
		"Kindly do ZK social verifications and increase your limits to place more orders",
	ZERO_REPUTATION_POINTS: "Cannot place buy orders with 0 reputation points",
	NO_REPUTATION: "No reputation points",
	INSUFFICIENT_RP: "Insufficient reputation points",
	NULLIFIER_ALREADY_VERIFIED: "Nullifier already verified",
	VERIFICATION_FAILED: "Verification failed",
	INVALID_SOCIAL_PLATFORM: "Invalid social media platform",
	SOCIAL_ALREADY_VERIFIED: "Social already verified",
	YEAR_FIELD_NOT_IN_PROOF: "Year field not found in proof",
	USER_ID_FIELD_NOT_IN_PROOF: "User ID field not found in proof",
	USER_ID_ALREADY_VERIFIED: "The social media account's user ID is already verified",
	USERNAME_ALREADY_VERIFIED: "The social media account's username is already verified",
	USERNAME_NOT_IN_PROOF: "Username field not found in proof",
	LINKEDIN_ONLY_RP_UPDATES: "LinkedIn only supports RP updates",
	FACEBOOK_ONLY_RP_UPDATES: "Facebook only supports RP updates",

	// Voting / referral
	ALREADY_REFERRED: "Already referred",
	SELF_REFERRAL_NOT_ALLOWED: "Self referral not allowed",
	NOT_ELIGIBLE_TO_REFER: "Not eligible to refer",
	MERCHANT_MONTHLY_REFERRAL_LIMIT_REACHED: "Merchant monthly referral limit reached",
	NO_RECOMMENDER: "No recommender found",
	RECOMMENDATION_ALREADY_CLAIMED: "Recommendation already claimed",
	CANNOT_VOTE_YOURSELF: "Cannot vote yourself",
	VOTES_PER_EPOCH_EXCEEDED: "Votes per epoch exceeded",
	ALREADY_VOTED: "Already voted",
	FUNCTION_NOT_FOUND: "Function not found",

	// Campaign
	CAMPAIGN_NOT_ACTIVE: "Campaign is not active",
	INVALID_MANAGER_DETAILS: "Invalid manager details",
	UNCLAIMED_REWARDS_EXIST: "Unclaimed rewards exist",
	REWARD_ALREADY_CLAIMED: "Reward already claimed",
	ONLY_NEW_USERS_ALLOWED: "Only new users allowed",
	MANAGER_NOT_FOUND: "Manager not found",
	MANAGER_INACTIVE: "Manager is inactive",
	NO_REWARDS: "No rewards",
	INVALID_CAMPAIGN_ID: "Invalid campaign ID",
	CANNOT_CLAIM_REVENUE_FOR_CURRENT_MONTH: "Cannot claim revenue for the current month",

	// Referral reward config
	REWARD_PERCENTAGE_TOO_HIGH: "Reward percentage is too high",

	// Signature / nonce
	NONCE_ALREADY_USED: "Nonce already used",
	SIGNATURE_VALIDATION_FAILED: "Signature validation failed",

	// Misc
	INVALID_ADDRESS: "Invalid address",
	INVALID_BLOCK_AMOUNT: "Invalid block amount",
	INVALID_AMOUNT: "Invalid amount",
	INVALID_INPUT: "Invalid input",
	INVALID_STATUS_TRANSITION: "Invalid status transition",
	ARRAY_LENGTH_MISMATCH: "Array length mismatch",
	USER_IS_BLACKLISTED: "User is blacklisted",
	ZERO_ADDRESS: "Zero address",
	REENTRANCY_GUARD: "Reentrancy detected",
	BATCH_TOO_LARGE: "Batch size too large",
	UNDERFLOW_SUBTRACTION: "Cannot subtract more than balance",
	TARGET_LONGER_THAN_DATA: "Target is longer than data",
};

/**
 * Returns a human-readable English string for the given `ContractErrorCode`,
 * or a generic fallback message if the code is not recognised.
 *
 * @example
 * const msg = getContractErrorMessage("USERNAME_ALREADY_VERIFIED");
 * // "The social media account's username is already verified"
 */
export function getContractErrorMessage(
	code: ContractErrorCode | string | null | undefined,
	fallback = "Something went wrong. Please try again.",
): string {
	if (!code) return fallback;
	return contractErrorMessages[code as ContractErrorCode] ?? fallback;
}
