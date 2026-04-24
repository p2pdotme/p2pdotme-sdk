/**
 * Centralized contract error definitions mirroring `contracts/libraries/Errors.sol`.
 * Maps Solidity custom error names and their 4-byte selectors to human-readable codes.
 */

export const contractErrors = {
	// Access control
	NotAdmin: "NOT_ADMIN",
	NotSuperAdmin: "NOT_SUPER_ADMIN",
	NotAuthorized: "NOT_AUTHORIZED",
	NotSelf: "NOT_SELF",
	NotWhitelisted: "NOT_WHITELISTED",
	NotCircleAdmin: "NOT_CIRCLE_ADMIN",

	// Circle / community management
	InvalidName: "INVALID_NAME",
	InvalidCommunityUrl: "INVALID_COMMUNITY_URL",
	InvalidAdminCommunityUrl: "INVALID_ADMIN_COMMUNITY_URL",
	AdminAlreadyHasCircle: "ADMIN_ALREADY_HAS_CIRCLE",
	CircleNameAlreadyTaken: "CIRCLE_NAME_ALREADY_TAKEN",
	P2PStakeConfigNotSet: "P2P_STAKE_CONFIG_NOT_SET",
	InsufficientP2PStake: "INSUFFICIENT_P2P_STAKE",
	P2PTokenNotSet: "P2P_TOKEN_NOT_SET",
	P2PUnstakeRequestPending: "P2P_UNSTAKE_REQUEST_PENDING",
	NoP2PUnstakeRequest: "NO_P2P_UNSTAKE_REQUEST",
	P2PUnstakeCooldownNotPassed: "P2P_UNSTAKE_COOLDOWN_NOT_PASSED",
	SlashAmountExceedsStake: "SLASH_AMOUNT_EXCEEDS_STAKE",
	CircleNotActive: "CIRCLE_NOT_ACTIVE",
	InvalidCircleId: "INVALID_CIRCLE_ID",
	CurrencyMismatch: "CURRENCY_MISMATCH",
	CircleFull: "CIRCLE_FULL",
	CircleIdMismatch: "CIRCLE_ID_MISMATCH",
	DuplicateAccountName: "DUPLICATE_ACCOUNT_NAME",
	EmptyName: "EMPTY_NAME",
	AccountBoundToAnotherCircle: "ACCOUNT_BOUND_TO_ANOTHER_CIRCLE",
	ExitAmountExceededCircleBalance: "EXIT_AMOUNT_EXCEEDED_CIRCLE_BALANCE",
	UndelegationAmountTooHigh: "UNDELEGATION_AMOUNT_TOO_HIGH",

	// Exchange / order lifecycle
	ExchangeNotOperational: "EXCHANGE_NOT_OPERATIONAL",
	OrderNotPlaced: "ORDER_NOT_PLACED",
	OrderNotPaid: "ORDER_NOT_PAID",
	OrderStatusInvalid: "ORDER_STATUS_INVALID",
	OrderExpired: "ORDER_EXPIRED",
	OrderAlreadyPaid: "ORDER_ALREADY_PAID",
	OrderAlreadyCompleted: "ORDER_ALREADY_COMPLETED",
	InvalidOrderType: "INVALID_ORDER_TYPE",
	OrderTypeIncorrect: "ORDER_TYPE_INCORRECT",
	OrderNotAccepted: "ORDER_NOT_ACCEPTED",
	OrderNotAssigned: "ORDER_NOT_ASSIGNED",
	OrderAmountExceedsLimit: "ORDER_AMOUNT_EXCEEDS_LIMIT",
	InvalidOrderAmount: "INVALID_ORDER_AMOUNT",
	InvalidOrderAmountToCoverFee: "INVALID_ORDER_AMOUNT_TO_COVER_FEE",
	InvalidOrderId: "INVALID_ORDER_ID",
	OrderTooEarlyForReassignment: "ORDER_TOO_EARLY_FOR_REASSIGNMENT",
	OrderTooLateForReassignment: "ORDER_TOO_LATE_FOR_REASSIGNMENT",
	ReAssignmentNotRequired: "REASSIGNMENT_NOT_REQUIRED",
	TipAlreadyGiven: "TIP_ALREADY_GIVEN",
	CashbackTransferFailed: "CASHBACK_TRANSFER_FAILED",

	// Order limits
	DailyBuyOrderLimitExceeded: "DAILY_BUY_ORDER_LIMIT_EXCEEDED",
	MonthlyBuyOrderLimitExceeded: "MONTHLY_BUY_ORDER_LIMIT_EXCEEDED",
	SellOrderAmountLimitExceeded: "SELL_ORDER_AMOUNT_LIMIT_EXCEEDED",
	BuyOrderAmountExceedsLimit: "BUY_ORDER_AMOUNT_EXCEEDS_LIMIT",
	SellOrderAmountExceedsLimit: "SELL_ORDER_AMOUNT_EXCEEDS_LIMIT",
	BuyAmountExceedsUsdcLimit: "BUY_AMOUNT_EXCEEDS_USDC_LIMIT",
	SellAmountExceedsFiatLimit: "SELL_AMOUNT_EXCEEDS_FIAT_LIMIT",
	DailyVolumeLimitExceeded: "DAILY_VOLUME_LIMIT_EXCEEDED",
	MonthlyVolumeLimitExceeded: "MONTHLY_VOLUME_LIMIT_EXCEEDED",
	UserYearlyVolumeLimitExceeded: "USER_YEARLY_VOLUME_LIMIT_EXCEEDED",

	// Dispute
	DisputeTimeNotReached: "DISPUTE_TIME_NOT_REACHED",
	DisputeTimeExpired: "DISPUTE_TIME_EXPIRED",
	InvalidOrderStatusToRaiseDispute: "INVALID_ORDER_STATUS_TO_RAISE_DISPUTE",
	DisputeNotRaised: "DISPUTE_NOT_RAISED",
	CannotRaiseDisputeTwice: "CANNOT_RAISE_DISPUTE_TWICE",
	DisputeAlreadySettled: "DISPUTE_ALREADY_SETTLED",
	TransactionIdMismatch: "TRANSACTION_ID_MISMATCH",
	AccountNumberMismatch: "ACCOUNT_NUMBER_MISMATCH",
	NotPaidBuyOrder: "NOT_PAID_BUY_ORDER",

	// Payment channels
	PaymentChannelNotFound: "PAYMENT_CHANNEL_NOT_FOUND",
	PaymentChannelNotActive: "PAYMENT_CHANNEL_NOT_ACTIVE",
	PaymentChannelNotApproved: "PAYMENT_CHANNEL_NOT_APPROVED",
	PaymentChannelNotRejected: "PAYMENT_CHANNEL_NOT_REJECTED",
	InvalidPaymentChannelId: "INVALID_PAYMENT_CHANNEL_ID",
	DuplicatePaymentChannel: "DUPLICATE_PAYMENT_CHANNEL",
	OldPaymentChannelNotFound: "OLD_PAYMENT_CHANNEL_NOT_FOUND",
	NewPaymentChannelNotFound: "NEW_PAYMENT_CHANNEL_NOT_FOUND",
	SamePaymentChannel: "SAME_PAYMENT_CHANNEL",
	OldPaymentChannelShouldBeInactive: "OLD_PAYMENT_CHANNEL_SHOULD_BE_INACTIVE",
	NewPaymentChannelShouldBeActive: "NEW_PAYMENT_CHANNEL_SHOULD_BE_ACTIVE",
	OngoingOrderOnPaymentChannel: "ONGOING_ORDER_ON_PAYMENT_CHANNEL",
	UpiAlreadySent: "UPI_ALREADY_SENT",
	InvalidOrderUpi: "INVALID_ORDER_UPI",
	NoFiatLiquidity: "NO_FIAT_LIQUIDITY",

	// Merchant
	NotEnoughEligibleMerchants: "NOT_ENOUGH_ELIGIBLE_MERCHANTS",
	MerchantNotRegistered: "MERCHANT_NOT_REGISTERED",
	MerchantNotApproved: "MERCHANT_NOT_APPROVED",
	MerchantAlreadyRegistered: "MERCHANT_ALREADY_REGISTERED",
	MerchantAlreadyRejected: "MERCHANT_ALREADY_REJECTED",
	MerchantBlacklisted: "MERCHANT_BLACKLISTED",
	MerchantNotBlacklisted: "MERCHANT_NOT_BLACKLISTED",
	MerchantAlreadyBlacklisted: "MERCHANT_ALREADY_BLACKLISTED",
	MerchantHasOngoingOrders: "MERCHANT_HAS_ONGOING_ORDERS",
	MerchantNotFullfilledEligibilityThreshold: "MERCHANT_NOT_FULLFILLED_ELIGIBILITY_THRESHOLD",
	InvalidMerchant: "INVALID_MERCHANT",

	// Staking / unstaking
	StakeAmountTooLow: "STAKE_AMOUNT_TOO_LOW",
	AdditionalStakeNotAllowed: "ADDITIONAL_STAKE_NOT_ALLOWED",
	UnstakeRequestPending: "UNSTAKE_REQUEST_PENDING",
	UnstakeRequestNotPending: "UNSTAKE_REQUEST_NOT_PENDING",
	UnstakeAmountExceeded: "UNSTAKE_AMOUNT_EXCEEDED",
	ZeroUnstakeAmount: "ZERO_UNSTAKE_AMOUNT",
	NoWithdrawableAmount: "NO_WITHDRAWABLE_AMOUNT",
	NoStake: "NO_STAKE",
	NoStakers: "NO_STAKERS",
	InsufficientStakedAmount: "INSUFFICIENT_STAKED_AMOUNT",
	CooldownNotPassed: "COOLDOWN_NOT_PASSED",
	ClaimableRewardsNotAvailable: "CLAIMABLE_REWARDS_NOT_AVAILABLE",

	// Delegation
	ExitWouldBreachDelegationInvariant: "EXIT_WOULD_BREACH_DELEGATION_INVARIANT",
	AggregateDelegationExceedsTotalStaked: "AGGREGATE_DELEGATION_EXCEEDS_TOTAL_STAKED",
	InsufficientMerchantRewards: "INSUFFICIENT_MERCHANT_REWARDS",

	// Migration
	InvalidMigrationStatus: "INVALID_MIGRATION_STATUS",
	MigrationRequestNotPending: "MIGRATION_REQUEST_NOT_PENDING",
	MigrationAlreadyRequested: "MIGRATION_ALREADY_REQUESTED",

	// Token / currency
	TokenAlreadyExists: "TOKEN_ALREADY_EXISTS",
	TokenNotFound: "TOKEN_NOT_FOUND",
	TokenEmpty: "TOKEN_EMPTY",
	CurrencyNotSupported: "CURRENCY_NOT_SUPPORTED",
	InvalidCurrency: "INVALID_CURRENCY",

	// USDC / transfer
	UsdtTransferFailed: "USDC_TRANSFER_FAILED",
	UsdtTransferFailedWithErrorMessage: "USDC_TRANSFER_FAILED_WITH_ERROR_MESSAGE",
	UsdtTransferFailedWithPanic: "USDC_TRANSFER_FAILED_WITH_PANIC",
	InsufficientAllowance: "INSUFFICIENT_ALLOWANCE",

	// ZK Passport
	ZKPassportVerifierNotSet: "ZK_PASSPORT_VERIFIER_NOT_SET",
	ZKPassportDomainEmpty: "ZK_PASSPORT_DOMAIN_EMPTY",
	ZKPassportScopeEmpty: "ZK_PASSPORT_SCOPE_EMPTY",
	PassportAlreadyVerified: "PASSPORT_ALREADY_VERIFIED",
	ZKPassportProofInvalid: "ZK_PASSPORT_PROOF_INVALID",
	ZKPassportIdentifierAlreadyVerified: "ZK_PASSPORT_IDENTIFIER_ALREADY_VERIFIED",
	ZKPassportInvalidScope: "ZK_PASSPORT_INVALID_SCOPE",
	ZKPassportUnexpectedSender: "ZK_PASSPORT_UNEXPECTED_SENDER",
	ZKPassportAgeBelowMinimum: "ZK_PASSPORT_AGE_BELOW_MINIMUM",
	ZKPassportMinAgeTooHigh: "ZK_PASSPORT_MIN_AGE_TOO_HIGH",

	// Chainlink / oracle
	UnexpectedRequestId: "UNEXPECTED_REQUEST_ID",
	OnlyRouterCanFulfill: "ONLY_ROUTER_CAN_FULFILL",
	RequestFailed: "REQUEST_FAILED",
	SourceCodeMismatch: "SOURCE_CODE_MISMATCH",
	ZeroMarketPrice: "ZERO_MARKET_PRICE",
	InvalidComputedPrices: "INVALID_COMPUTED_PRICES",
	NotPriceUpdaterForCurrency: "NOT_PRICE_UPDATER_FOR_CURRENCY",
	ThresholdNotConfigured: "THRESHOLD_NOT_CONFIGURED",
	SlippageExceeded: "SLIPPAGE_EXCEEDED",

	// Reputation / verification
	UserHasNoReputation: "USER_HAS_NO_REPUTATION",
	ZeroReputationPoints: "ZERO_REPUTATION_POINTS",
	NoReputation: "NO_REPUTATION",
	InsufficientRP: "INSUFFICIENT_RP",
	NullifierAlreadyVerified: "NULLIFIER_ALREADY_VERIFIED",
	VerificationFailed: "VERIFICATION_FAILED",
	InvalidSocialPlatform: "INVALID_SOCIAL_PLATFORM",
	SocialAlreadyVerified: "SOCIAL_ALREADY_VERIFIED",
	YearFieldNotInProof: "YEAR_FIELD_NOT_IN_PROOF",
	UserIdFieldNotInProof: "USER_ID_FIELD_NOT_IN_PROOF",
	UserIdAlreadyVerified: "USER_ID_ALREADY_VERIFIED",
	UsernameAlreadyVerified: "USERNAME_ALREADY_VERIFIED",
	UsernameNotInProof: "USERNAME_NOT_IN_PROOF",
	LinkedInOnlyRpUpdates: "LINKEDIN_ONLY_RP_UPDATES",
	FacebookOnlyRpUpdates: "FACEBOOK_ONLY_RP_UPDATES",

	// Voting / referral
	AlreadyReferred: "ALREADY_REFERRED",
	SelfReferralNotAllowed: "SELF_REFERRAL_NOT_ALLOWED",
	NotEligibleToRefer: "NOT_ELIGIBLE_TO_REFER",
	MerchantMonthlyReferralLimitReached: "MERCHANT_MONTHLY_REFERRAL_LIMIT_REACHED",
	NoRecommender: "NO_RECOMMENDER",
	RecommendationAlreadyClaimed: "RECOMMENDATION_ALREADY_CLAIMED",
	CannotVoteYourself: "CANNOT_VOTE_YOURSELF",
	VotesPerEpochExceeded: "VOTES_PER_EPOCH_EXCEEDED",
	AlreadyVoted: "ALREADY_VOTED",
	FunctionNotFound: "FUNCTION_NOT_FOUND",

	// Campaign
	CampaignNotActive: "CAMPAIGN_NOT_ACTIVE",
	InvalidManagerDetails: "INVALID_MANAGER_DETAILS",
	UnclaimedRewardsExist: "UNCLAIMED_REWARDS_EXIST",
	RewardAlreadyClaimed: "REWARD_ALREADY_CLAIMED",
	OnlyNewUsersAllowed: "ONLY_NEW_USERS_ALLOWED",
	ManagerNotFound: "MANAGER_NOT_FOUND",
	ManagerInactive: "MANAGER_INACTIVE",
	NoRewards: "NO_REWARDS",
	InvalidCampaignId: "INVALID_CAMPAIGN_ID",
	CannotClaimRevenueForCurrentMonth: "CANNOT_CLAIM_REVENUE_FOR_CURRENT_MONTH",

	// Referral reward config
	RewardPercentageTooHigh: "REWARD_PERCENTAGE_TOO_HIGH",

	// Signature / nonce
	NonceAlreadyUsed: "NONCE_ALREADY_USED",
	SignatureValidationFailed: "SIGNATURE_VALIDATION_FAILED",

	// Misc
	InvalidAddress: "INVALID_ADDRESS",
	InvalidBlockAmount: "INVALID_BLOCK_AMOUNT",
	InvalidAmount: "INVALID_AMOUNT",
	InvalidInput: "INVALID_INPUT",
	InvalidStatusTransition: "INVALID_STATUS_TRANSITION",
	ArrayLengthMismatch: "ARRAY_LENGTH_MISMATCH",
	UserIsBlacklisted: "USER_IS_BLACKLISTED",
	ZeroAddress: "ZERO_ADDRESS",
	ReentrancyGuard: "REENTRANCY_GUARD",
	BatchTooLarge: "BATCH_TOO_LARGE",
	UnderflowSubtraction: "UNDERFLOW_SUBTRACTION",
	TargetLongerThanData: "TARGET_LONGER_THAN_DATA",
} as const;

export type ContractErrorCode = (typeof contractErrors)[keyof typeof contractErrors];

/** Maps 4-byte Solidity custom error selectors to their error codes. */
export const hexContractErrors: Record<string, ContractErrorCode> = {
	// Access control
	"0x7bfa4b9f": contractErrors.NotAdmin,
	"0x16c726b1": contractErrors.NotSuperAdmin,
	"0xea8e4eb5": contractErrors.NotAuthorized,
	"0x29c3b7ee": contractErrors.NotSelf,
	"0x584a7938": contractErrors.NotWhitelisted,
	"0xa8143fbc": contractErrors.NotCircleAdmin,

	// Circle / community management
	"0x430f13b3": contractErrors.InvalidName,
	"0xe7cbf75a": contractErrors.InvalidCommunityUrl,
	"0x3762bfee": contractErrors.InvalidAdminCommunityUrl,
	"0x201c1ffc": contractErrors.AdminAlreadyHasCircle,
	"0x6540a51d": contractErrors.CircleNameAlreadyTaken,
	"0xcadc6786": contractErrors.P2PStakeConfigNotSet,
	"0x78317f44": contractErrors.InsufficientP2PStake,
	"0x18eda032": contractErrors.P2PTokenNotSet,
	"0xdab11ea6": contractErrors.P2PUnstakeRequestPending,
	"0xeb1ce40b": contractErrors.NoP2PUnstakeRequest,
	"0xbf2d0ba1": contractErrors.P2PUnstakeCooldownNotPassed,
	"0x06b663af": contractErrors.SlashAmountExceedsStake,
	"0xff9b022c": contractErrors.CircleNotActive,
	"0x3d90c0a6": contractErrors.InvalidCircleId,
	"0xfb42a67d": contractErrors.CurrencyMismatch,
	"0xf2775265": contractErrors.CircleFull,
	"0x784b6c3c": contractErrors.CircleIdMismatch,
	"0xee240e49": contractErrors.DuplicateAccountName,
	"0x2ef13105": contractErrors.EmptyName,
	"0x1b5433c8": contractErrors.AccountBoundToAnotherCircle,
	"0x549e2555": contractErrors.ExitAmountExceededCircleBalance,
	"0x865b21e1": contractErrors.UndelegationAmountTooHigh,

	// Exchange / order lifecycle
	"0x4bbac5de": contractErrors.ExchangeNotOperational,
	"0x58db8ed6": contractErrors.OrderNotPlaced,
	"0x1e3b9629": contractErrors.OrderNotPaid,
	"0x181b1b2e": contractErrors.OrderStatusInvalid,
	"0xc56873ba": contractErrors.OrderExpired,
	"0x7f61b868": contractErrors.OrderAlreadyPaid,
	"0x03683687": contractErrors.OrderAlreadyCompleted,
	"0x688c176f": contractErrors.InvalidOrderType,
	"0x2e757a60": contractErrors.OrderTypeIncorrect,
	"0x6b1b90b4": contractErrors.OrderNotAccepted,
	"0x1775c43e": contractErrors.OrderNotAssigned,
	"0xf42e41a1": contractErrors.OrderAmountExceedsLimit,
	"0x93845d68": contractErrors.InvalidOrderAmount,
	"0x138b9d5a": contractErrors.InvalidOrderAmountToCoverFee,
	"0x5d706033": contractErrors.InvalidOrderId,
	"0xbb776720": contractErrors.OrderTooEarlyForReassignment,
	"0x20d5910f": contractErrors.OrderTooLateForReassignment,
	"0xccd87bf0": contractErrors.ReAssignmentNotRequired,
	"0xb20277f8": contractErrors.TipAlreadyGiven,
	"0xdf9f707c": contractErrors.CashbackTransferFailed,

	// Order limits
	"0xe595a7bf": contractErrors.DailyBuyOrderLimitExceeded,
	"0x675dbc86": contractErrors.MonthlyBuyOrderLimitExceeded,
	"0x64301cb8": contractErrors.SellOrderAmountLimitExceeded,
	"0x91da284f": contractErrors.BuyOrderAmountExceedsLimit,
	"0xb407b9ec": contractErrors.SellOrderAmountExceedsLimit,
	"0x4b29cf0a": contractErrors.BuyAmountExceedsUsdcLimit,
	"0xbba2edf9": contractErrors.SellAmountExceedsFiatLimit,
	"0x7e2ee654": contractErrors.DailyVolumeLimitExceeded,
	"0x49de1789": contractErrors.MonthlyVolumeLimitExceeded,
	"0xb14a1ff3": contractErrors.UserYearlyVolumeLimitExceeded,

	// Dispute
	"0x07a2454f": contractErrors.DisputeTimeNotReached,
	"0xb28c3e29": contractErrors.DisputeTimeExpired,
	"0x2a829f07": contractErrors.InvalidOrderStatusToRaiseDispute,
	"0x88d039ce": contractErrors.DisputeNotRaised,
	"0x3764a75c": contractErrors.CannotRaiseDisputeTwice,
	"0x866e9f89": contractErrors.DisputeAlreadySettled,
	"0x6131d13d": contractErrors.TransactionIdMismatch,
	"0x8ec051b8": contractErrors.AccountNumberMismatch,
	"0xf8bfad32": contractErrors.NotPaidBuyOrder,

	// Payment channels
	"0x552ff5ec": contractErrors.PaymentChannelNotFound,
	"0xfccd93cf": contractErrors.PaymentChannelNotActive,
	"0x6764f4d6": contractErrors.PaymentChannelNotApproved,
	"0xab284291": contractErrors.PaymentChannelNotRejected,
	"0x99c8ef4d": contractErrors.InvalidPaymentChannelId,
	"0x0569ab3e": contractErrors.DuplicatePaymentChannel,
	"0xff4f83ca": contractErrors.OldPaymentChannelNotFound,
	"0xb1198199": contractErrors.NewPaymentChannelNotFound,
	"0xc905b99a": contractErrors.SamePaymentChannel,
	"0xcedb41f1": contractErrors.OldPaymentChannelShouldBeInactive,
	"0x487add97": contractErrors.NewPaymentChannelShouldBeActive,
	"0x6d4c3f9e": contractErrors.OngoingOrderOnPaymentChannel,
	"0xc1654697": contractErrors.UpiAlreadySent,
	"0xaa60ec26": contractErrors.InvalidOrderUpi,
	"0x81c2b982": contractErrors.NoFiatLiquidity,

	// Merchant
	"0x5d04ff4c": contractErrors.NotEnoughEligibleMerchants,
	"0xa6af7ebe": contractErrors.MerchantNotRegistered,
	"0x7290a612": contractErrors.MerchantNotApproved,
	"0xf4a1e014": contractErrors.MerchantAlreadyRegistered,
	"0x8713aaba": contractErrors.MerchantAlreadyRejected,
	"0x9ae55bc7": contractErrors.MerchantBlacklisted,
	"0x0ee0b659": contractErrors.MerchantNotBlacklisted,
	"0x5f765689": contractErrors.MerchantAlreadyBlacklisted,
	"0x9c54e5a8": contractErrors.MerchantHasOngoingOrders,
	"0x70d753bd": contractErrors.MerchantNotFullfilledEligibilityThreshold,
	"0xc0b6c919": contractErrors.InvalidMerchant,

	// Staking / unstaking
	"0x3fd2347e": contractErrors.StakeAmountTooLow,
	"0x703cde0a": contractErrors.AdditionalStakeNotAllowed,
	"0xa9de99ae": contractErrors.UnstakeRequestPending,
	"0x0b7c70f3": contractErrors.UnstakeRequestNotPending,
	"0xe665491f": contractErrors.UnstakeAmountExceeded,
	"0x2d3087f9": contractErrors.ZeroUnstakeAmount,
	"0x1b1d7861": contractErrors.NoWithdrawableAmount,
	"0xcacf989a": contractErrors.NoStake,
	"0x21311aa3": contractErrors.NoStakers,
	"0xd06ff88e": contractErrors.InsufficientStakedAmount,
	"0x9ab7872d": contractErrors.CooldownNotPassed,
	"0x73380d99": contractErrors.ClaimableRewardsNotAvailable,

	// Delegation
	"0xec4b3ce6": contractErrors.ExitWouldBreachDelegationInvariant,
	"0x8f90a426": contractErrors.AggregateDelegationExceedsTotalStaked,
	"0x2cc11576": contractErrors.InsufficientMerchantRewards,

	// Migration
	"0x92aa7d0f": contractErrors.InvalidMigrationStatus,
	"0x7ff47425": contractErrors.MigrationRequestNotPending,
	"0x88ddec46": contractErrors.MigrationAlreadyRequested,

	// Token / currency
	"0xc991cbb1": contractErrors.TokenAlreadyExists,
	"0xcbdb7b30": contractErrors.TokenNotFound,
	"0x9f11a53f": contractErrors.TokenEmpty,
	"0x02a6fdd2": contractErrors.CurrencyNotSupported,
	"0xf5993428": contractErrors.InvalidCurrency,

	// USDC / transfer
	"0x149f9fca": contractErrors.UsdtTransferFailed,
	"0x47bfece5": contractErrors.UsdtTransferFailedWithErrorMessage,
	"0x279bbc0c": contractErrors.UsdtTransferFailedWithPanic,
	"0xfb8f41b2": contractErrors.InsufficientAllowance,

	// ZK Passport
	"0xfd8d4a6d": contractErrors.ZKPassportVerifierNotSet,
	"0xb87078f9": contractErrors.ZKPassportDomainEmpty,
	"0x5eadc4c2": contractErrors.ZKPassportScopeEmpty,
	"0x7642fe15": contractErrors.PassportAlreadyVerified,
	"0x1fa24b35": contractErrors.ZKPassportProofInvalid,
	"0x36bdb7b6": contractErrors.ZKPassportIdentifierAlreadyVerified,
	"0xd13a7934": contractErrors.ZKPassportInvalidScope,
	"0x69f5bfe7": contractErrors.ZKPassportUnexpectedSender,
	"0x0464115c": contractErrors.ZKPassportAgeBelowMinimum,
	"0x48183836": contractErrors.ZKPassportMinAgeTooHigh,

	// Chainlink / oracle
	"0x7f73f237": contractErrors.UnexpectedRequestId,
	"0xab948796": contractErrors.OnlyRouterCanFulfill,
	"0x61982c98": contractErrors.RequestFailed,
	"0xab66be18": contractErrors.SourceCodeMismatch,
	"0xff2826ef": contractErrors.ZeroMarketPrice,
	"0xbb6c216c": contractErrors.InvalidComputedPrices,
	"0x3a8fbef4": contractErrors.NotPriceUpdaterForCurrency,
	"0x3e2c36f2": contractErrors.ThresholdNotConfigured,
	"0x71c4efed": contractErrors.SlippageExceeded,

	// Reputation / verification
	"0x071ea33c": contractErrors.UserHasNoReputation,
	"0xd2e1e6e0": contractErrors.ZeroReputationPoints,
	"0x3c0ca622": contractErrors.NoReputation,
	"0x412dd2b1": contractErrors.InsufficientRP,
	"0x0f165e7b": contractErrors.NullifierAlreadyVerified,
	"0x439cc0cd": contractErrors.VerificationFailed,
	"0x2366073b": contractErrors.InvalidSocialPlatform,
	"0x2f850b6b": contractErrors.SocialAlreadyVerified,
	"0x466f52a8": contractErrors.YearFieldNotInProof,
	"0x4d460588": contractErrors.UserIdFieldNotInProof,
	"0xa18ea4e8": contractErrors.UserIdAlreadyVerified,
	"0x69470b13": contractErrors.UsernameAlreadyVerified,
	"0x8390b2dd": contractErrors.UsernameNotInProof,
	"0xef053cf4": contractErrors.LinkedInOnlyRpUpdates,
	"0x355b0709": contractErrors.FacebookOnlyRpUpdates,

	// Voting / referral
	"0x7aabdfe3": contractErrors.AlreadyReferred,
	"0x83463f4a": contractErrors.SelfReferralNotAllowed,
	"0x69f6994a": contractErrors.NotEligibleToRefer,
	"0x1b19ad97": contractErrors.MerchantMonthlyReferralLimitReached,
	"0x944a2241": contractErrors.NoRecommender,
	"0x0ece93a6": contractErrors.RecommendationAlreadyClaimed,
	"0x74785d0f": contractErrors.CannotVoteYourself,
	"0xc26d5f75": contractErrors.VotesPerEpochExceeded,
	"0x7c9a1cf9": contractErrors.AlreadyVoted,
	"0x403e7fa6": contractErrors.FunctionNotFound,

	// Campaign
	"0x7a551e38": contractErrors.CampaignNotActive,
	"0x668ca75d": contractErrors.InvalidManagerDetails,
	"0x2f950361": contractErrors.UnclaimedRewardsExist,
	"0x626b7c00": contractErrors.RewardAlreadyClaimed,
	"0x902ade67": contractErrors.OnlyNewUsersAllowed,
	"0x22a5e34b": contractErrors.ManagerNotFound,
	"0xa1610e37": contractErrors.ManagerInactive,
	"0x3fb087f4": contractErrors.NoRewards,
	"0x3eedee0f": contractErrors.InvalidCampaignId,
	"0x302c5138": contractErrors.CannotClaimRevenueForCurrentMonth,

	// Referral reward config
	"0x074a6991": contractErrors.RewardPercentageTooHigh,

	// Signature / nonce
	"0x1fb09b80": contractErrors.NonceAlreadyUsed,
	"0x2fdec18b": contractErrors.SignatureValidationFailed,

	// Misc
	"0xe6c4247b": contractErrors.InvalidAddress,
	"0x3eb17c88": contractErrors.InvalidBlockAmount,
	"0x2c5211c6": contractErrors.InvalidAmount,
	"0xb4fa3fb3": contractErrors.InvalidInput,
	"0x1117a646": contractErrors.InvalidStatusTransition,
	"0xa24a13a6": contractErrors.ArrayLengthMismatch,
	"0xebb6f34b": contractErrors.UserIsBlacklisted,
	"0xd92e233d": contractErrors.ZeroAddress,
	"0x8beb9d16": contractErrors.ReentrancyGuard,
	"0xbb1cb70b": contractErrors.BatchTooLarge,
	"0xd97cf1ba": contractErrors.UnderflowSubtraction,
	"0xc9b16952": contractErrors.TargetLongerThanData,
};

/**
 * Parses an unknown contract revert into a `ContractErrorCode` string.
 * Inspects hex selectors in `data`, `message`, and nested `cause` fields.
 * Returns `null` if no known error is matched.
 */
export function parseContractError(error: unknown): ContractErrorCode | null {
	if (!error) return null;

	if (typeof error === "string") {
		const direct = hexContractErrors[error];
		if (direct) return direct;

		const hexMatch = error.match(/0x[a-fA-F0-9]{8}/);
		if (hexMatch) return hexContractErrors[hexMatch[0]] ?? null;

		return null;
	}

	if (typeof error === "object") {
		const e = error as {
			data?: string | { data?: string };
			message?: string;
			cause?: unknown;
		};

		if (e.data) {
			const hexCode = typeof e.data === "string" ? e.data : e.data.data;
			if (hexCode) {
				const match = hexContractErrors[hexCode];
				if (match) return match;
			}
		}

		if (typeof e.message === "string") {
			const hexMatch = e.message.match(/0x[a-fA-F0-9]{8}/);
			if (hexMatch) {
				const match = hexContractErrors[hexMatch[0]];
				if (match) return match;
			}

			const jsonMatch = e.message.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				try {
					const parsed: unknown = JSON.parse(jsonMatch[0]);
					const embedded = parseContractError(parsed);
					if (embedded) return embedded;
				} catch {
					// not valid JSON
				}
			}
		}

		if (e.cause) return parseContractError(e.cause);
	}

	return null;
}
