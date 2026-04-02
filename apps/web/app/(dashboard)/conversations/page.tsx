import { Metadata } from "next";

import { ConversationsView } from "@/modules/dashboard/ui/views/conversations-view";

export const metadata: Metadata = {
  title: "Conversations - Scylla",
  description: "Your conversations",
};

export default function Page() {
  return <ConversationsView />;
}
