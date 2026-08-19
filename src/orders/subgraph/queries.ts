export const ORDERS_BY_USER_QUERY = /* GraphQL */ `
  query OrdersByUser($user: Bytes!, $skip: Int!, $first: Int!) {
    orders_collection(
      where: { userAddress: $user }
      orderBy: placedAt
      orderDirection: desc
      skip: $skip
      first: $first
    ) {
      orderId
      type
      status
      circleId
      userAddress
      usdcRecipientAddress
      acceptedMerchantAddress
      usdcAmount
      fiatAmount
      actualUsdcAmount
      actualFiatAmount
      currency
      placedAt
      acceptedAt
      paidAt
      completedAt
      fixedFeePaid
      tipsPaid
      disputeStatus
    }
  }
`;

export const PLACEMENT_LIMITS_QUERY = /* GraphQL */ `
  query PlacementLimits($placementsId: ID!, $configId: ID!) {
    userDailyPlacements(id: $placementsId) {
      dayIndex
      buyPlacements
      sellPlacements
    }
    orderPlacementLimitConfig(id: $configId) {
      dailyBuyOrderPlacementLimit
      buyLimitConfigured
      dailySellOrderPlacementLimit
      sellLimitConfigured
    }
  }
`;
