export const CIRCLES_FOR_ROUTING_QUERY = /* GraphQL */ `
  query CirclesForRouting($currency: Bytes!) {
    circles(
      first: 1000
      where: {
        currency: $currency
        metrics_: {
          circleStatus_in: ["active", "bootstrap", "paused"]
        }
      }
    ) {
      circleId
      currency
      metrics {
        circleScore
        circleStatus
        scoreState {
          activeMerchantsCount
        }
      }
    }
  }
`;
