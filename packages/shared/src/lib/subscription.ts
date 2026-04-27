import { Doc } from "@workspace/backend/_generated/dataModel";
import { SUBSCRIPTION_STATUS } from "@workspace/shared/types/subscription";

export const hasSubscriptionFeatureAccess = (
  subscription:
    | Pick<Doc<"subscriptions">, "status" | "periodEnd">
    | null
    | undefined,
): boolean => {
  if (!subscription) return false;
  if (subscription.status === SUBSCRIPTION_STATUS.ACTIVE) return true;
  if (subscription.status === SUBSCRIPTION_STATUS.CANCELED) {
    return (
      subscription.periodEnd !== null && subscription.periodEnd > Date.now()
    );
  }
  return false;
};
