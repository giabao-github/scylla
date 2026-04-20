import { auth } from "@clerk/nextjs/server";
import { Metadata } from "next";

import { SubscriptionGate } from "@/modules/billing/ui/component/subscription-gate";
import { CustomizationErrorBoundary } from "@/modules/customization/ui/components/customization-error-boundary";
import { CustomizationView } from "@/modules/customization/ui/views/customization-view";

export const metadata: Metadata = {
  title: "Widget Customization - Scylla",
  description:
    "Customize your chat widget appearance and behavior for your customers.",
};

export default async function Page() {
  const { has } = await auth();
  const isPro = has?.({ plan: "pro" }) ?? false;

  return (
    <SubscriptionGate initialStatus={isPro ? "active" : "free"}>
      <CustomizationErrorBoundary>
        <CustomizationView />
      </CustomizationErrorBoundary>
    </SubscriptionGate>
  );
}
