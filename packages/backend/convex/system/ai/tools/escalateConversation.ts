import { internal } from "@workspace/backend/_generated/api";
import { createConversationTool } from "@workspace/backend/lib/createConversationTool";

export const escalateConversation = createConversationTool({
  description:
    "Escalate the conversation to a human operator. Use this when the user explicitly requests a human, when the issue is too complex to resolve automatically, or when the user expresses frustration or dissatisfaction with automated responses.",
  action: "escalate",
  mutation: internal.system.conversations.escalate,
  confirmationMessage: "Conversation escalated to a human operator.",
});
