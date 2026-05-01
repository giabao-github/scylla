import { getSubscriptionStatus } from "@/modules/billing/lib/subscription";
import { ConversationErrorBoundary } from "@/modules/dashboard/ui/components/conversation-error-boundary";
import { ConversationIdView } from "@/modules/dashboard/ui/views/conversation-id-view";

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
