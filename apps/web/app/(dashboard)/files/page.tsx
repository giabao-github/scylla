import { Metadata } from "next";

import { getSubscriptionStatus } from "@/modules/billing/lib/subscription";
import { SubscriptionGate } from "@/modules/billing/ui/component/subscription-gate";
import { FilesView } from "@/modules/files/ui/views/files-view";

export const metadata: Metadata = {
  title: "Knowledge Base",
  description: "Manage your knowledge base",
};

export default async function Page() {
  const initialStatus = await getSubscriptionStatus();

  return (
    <SubscriptionGate initialStatus={initialStatus}>
      <FilesView />
    </SubscriptionGate>
  );
}
