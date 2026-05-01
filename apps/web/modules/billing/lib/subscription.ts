import { auth } from "@clerk/nextjs/server";

import {
  INITIAL_SUBSCRIPTION_STATUS,
  type InitialSubscriptionStatus,
} from "@workspace/shared/types/subscription";

export const getSubscriptionStatus =
  async (): Promise<InitialSubscriptionStatus> => {
    const { has } = await auth();
    const isPro = has?.({ plan: "pro" }) ?? false;
    return isPro
      ? INITIAL_SUBSCRIPTION_STATUS.ACTIVE
      : INITIAL_SUBSCRIPTION_STATUS.FREE;
  };
