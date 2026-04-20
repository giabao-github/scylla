export const SUBSCRIPTION_STATUSES = ["free", "active", "canceled"] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
