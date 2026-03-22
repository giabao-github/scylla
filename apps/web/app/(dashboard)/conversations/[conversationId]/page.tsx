import { ConversationErrorBoundary } from "@/modules/dashboard/ui/components/conversation-error-boundary";
import { ConversationIdView } from "@/modules/dashboard/ui/views/conversation-id-view";

const Page = async ({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) => {
  const { conversationId } = await params;
  return (
    <ConversationErrorBoundary key={conversationId}>
      <ConversationIdView conversationId={conversationId} />
    </ConversationErrorBoundary>
  );
};

export default Page;
