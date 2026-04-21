export const SUBSCRIPTION_STATUS = {
  FREE: "free",
  ACTIVE: "active",
  CANCELED: "canceled",
} as const;

export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];
