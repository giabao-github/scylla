import { Metadata } from "next";

import { getSubscriptionStatus } from "@/modules/billing/lib/subscription";
import { SubscriptionGate } from "@/modules/billing/ui/component/subscription-gate";
import { CustomizationErrorBoundary } from "@/modules/customization/ui/components/customization-error-boundary";
import { CustomizationView } from "@/modules/customization/ui/views/customization-view";

export const metadata: Metadata = {
  title: "Widget Customization - Scylla",
  description:
    "Customize your chat widget appearance and behavior for your customers.",
};

export default async function Page() {
  const initialStatus = await getSubscriptionStatus();

  return (
    <SubscriptionGate initialStatus={initialStatus}>
      <CustomizationErrorBoundary>
        <CustomizationView initialStatus={initialStatus} />
      </CustomizationErrorBoundary>
    </SubscriptionGate>
  );
}
