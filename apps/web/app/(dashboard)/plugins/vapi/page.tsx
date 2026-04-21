import { Metadata } from "next";

import { getSubscriptionStatus } from "@/modules/billing/lib/subscription";
import { SubscriptionGate } from "@/modules/billing/ui/component/subscription-gate";
import { VapiView } from "@/modules/plugins/ui/views/vapi-view";

export const metadata: Metadata = {
  title: "Vapi Plugin - Scylla",
  description:
    "Connect your Vapi assistant to Scylla to enable AI-powered voice calls with your customers.",
};

export default async function Page() {
  const initialStatus = await getSubscriptionStatus();

  return (
    <SubscriptionGate initialStatus={initialStatus}>
      <VapiView initialStatus={initialStatus} />
    </SubscriptionGate>
  );
}
