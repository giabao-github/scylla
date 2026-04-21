import { auth } from "@clerk/nextjs/server";
import { type SubscriptionStatus } from "@workspace/shared/types/subscription";

export const getSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
  const { has } = await auth();
  const isPro = has?.({ plan: "pro" }) ?? false;
  return isPro ? "active" : "free";
};
