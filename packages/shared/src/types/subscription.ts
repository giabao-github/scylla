export const SUBSCRIPTION_STATUS = {
  FREE: "free",
  ACTIVE: "active",
  CANCELED: "canceled",
} as const;

export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export const INITIAL_SUBSCRIPTION_STATUS = {
  FREE: SUBSCRIPTION_STATUS.FREE,
  ACTIVE: SUBSCRIPTION_STATUS.ACTIVE,
} as const;

export type InitialSubscriptionStatus =
  (typeof INITIAL_SUBSCRIPTION_STATUS)[keyof typeof INITIAL_SUBSCRIPTION_STATUS];
