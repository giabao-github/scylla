import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { Metadata } from "next";

import { getSubscriptionStatus } from "@/modules/billing/lib/subscription";
import { ConversationErrorBoundary } from "@/modules/dashboard/ui/components/conversation-error-boundary";
import { ConversationIdView } from "@/modules/dashboard/ui/views/conversation-id-view";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}): Promise<Metadata> {
  const { conversationId } = await params;
  let title = "Chat";

  try {
    const { getToken } = await auth();
    const token = await getToken({ template: "convex" });

    if (!token) throw new Error("No auth token available");

    const conversation = await fetchQuery(
      api.private.conversations.getOne,
      { conversationId: conversationId as Id<"conversations"> },
      { token },
    );

    if (conversation?.contactSession) {
      const { name } = conversation.contactSession;
      title = `Chat - ${name || "Anonymous User"}`;
    }
  } catch (error) {
    console.error("Failed to fetch conversation metadata:", error);
  }

  return {
    title,
    description: "View and manage your conversation",
  };
}

const Page = async ({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) => {
  const { conversationId } = await params;
  const status = await getSubscriptionStatus();

  return (
    <ConversationErrorBoundary key={conversationId}>
      <ConversationIdView
        subscriptionStatus={status}
        conversationId={conversationId}
      />
    </ConversationErrorBoundary>
  );
};

export default Page;
