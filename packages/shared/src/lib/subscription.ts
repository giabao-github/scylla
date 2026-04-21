import { Doc } from "@workspace/backend/_generated/dataModel";

export const hasSubscriptionFeatureAccess = (
  subscription:
    | Pick<Doc<"subscriptions">, "status" | "periodEnd">
    | null
    | undefined,
): boolean => {
  if (!subscription) return false;
  if (subscription.status === "active") return true;
  if (subscription.status === "canceled") {
    return (
      subscription.periodEnd !== null && subscription.periodEnd > Date.now()
    );
  }
  return false;
};
