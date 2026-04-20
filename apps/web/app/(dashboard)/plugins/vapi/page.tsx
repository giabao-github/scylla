import { auth } from "@clerk/nextjs/server";
import { Metadata } from "next";

import { SubscriptionGate } from "@/modules/billing/ui/component/subscription-gate";
import { VapiView } from "@/modules/plugins/ui/views/vapi-view";

export const metadata: Metadata = {
  title: "Vapi Plugin - Scylla",
  description:
    "Connect your Vapi assistant to Scylla to enable AI-powered voice calls with your customers.",
};

export default async function Page() {
  const { has } = await auth();
  const isPro = has?.({ plan: "pro" }) ?? false;

  return (
    <SubscriptionGate initialStatus={isPro ? "active" : "free"}>
      <VapiView />
    </SubscriptionGate>
  );
}
