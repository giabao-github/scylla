import { auth } from "@clerk/nextjs/server";
import { Metadata } from "next";

import { BillingView } from "@/modules/billing/ui/views/billing-view";

export const metadata: Metadata = {
  title: "Billing & Plans - Scylla",
};

export default async function Page() {
  const { has } = await auth();
  const isPro = has?.({ plan: "pro" }) ?? false;

  return <BillingView initialStatus={isPro ? "active" : "free"} />;
}
