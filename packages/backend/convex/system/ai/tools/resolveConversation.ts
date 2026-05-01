import { internal } from "@workspace/backend/_generated/api";
import { createConversationTool } from "@workspace/backend/lib/createConversationTool";
import { CONVERSATION_SYSTEM_MESSAGES } from "@workspace/shared/lib/conversation-system-message";

export const resolveConversation = createConversationTool({
  description:
    "Resolve and close the conversation. Use this when the user's issue has been fully addressed, the user confirms they're satisfied, or there are no further questions remaining.",
  action: "resolve",
  mutation: internal.system.conversations.resolve,
  confirmationMessage: CONVERSATION_SYSTEM_MESSAGES.RESOLVED,
});
