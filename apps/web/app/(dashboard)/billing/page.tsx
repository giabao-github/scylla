import { Metadata } from "next";

import { getSubscriptionStatus } from "@/modules/billing/lib/subscription";
import { BillingView } from "@/modules/billing/ui/views/billing-view";

export const metadata: Metadata = {
  title: "Billing & Plans - Scylla",
};

export default async function Page() {
  const status = await getSubscriptionStatus();

  return <BillingView initialStatus={status} />;
}
