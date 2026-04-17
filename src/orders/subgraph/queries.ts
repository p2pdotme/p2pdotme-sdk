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
