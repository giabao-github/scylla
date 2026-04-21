import { auth } from "@clerk/nextjs/server";
import { InitialSubscriptionStatus } from "@workspace/shared/types/subscription";

export const getSubscriptionStatus =
  async (): Promise<InitialSubscriptionStatus> => {
    const { has } = await auth();
    const isPro = has?.({ plan: "pro" }) ?? false;
    return isPro ? "active" : "free";
  };
