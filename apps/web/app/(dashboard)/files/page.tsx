import { auth } from "@clerk/nextjs/server";
import { Metadata } from "next";

import { SubscriptionGate } from "@/modules/billing/ui/component/subscription-gate";
import { FilesView } from "@/modules/files/ui/views/files-view";

export const metadata: Metadata = {
  title: "Knowledge Base - Scylla",
  description: "Manage your knowledge base",
};

export default async function Page() {
  const { has } = await auth();
  const isPro = has?.({ plan: "pro" }) ?? false;

  return (
    <SubscriptionGate initialStatus={isPro ? "active" : "free"}>
      <FilesView />
    </SubscriptionGate>
  );
}
