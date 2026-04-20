import { auth } from "@clerk/nextjs/server";

import { ConversationErrorBoundary } from "@/modules/dashboard/ui/components/conversation-error-boundary";
import { ConversationIdView } from "@/modules/dashboard/ui/views/conversation-id-view";

const Page = async ({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) => {
  const { conversationId } = await params;
  const { has } = await auth();
  const isPro = has?.({ plan: "pro" }) ?? false;

  return (
    <ConversationErrorBoundary key={conversationId}>
      <ConversationIdView
        subscriptionStatus={isPro ? "active" : "free"}
        conversationId={conversationId}
      />
    </ConversationErrorBoundary>
  );
};

export default Page;
