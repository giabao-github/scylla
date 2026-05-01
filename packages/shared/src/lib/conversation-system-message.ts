export const CONVERSATION_SYSTEM_MESSAGES = {
  ESCALATED: "Conversation escalated to a human operator",
  RESOLVED: "Conversation resolved",
} as const;

const conversationSystemMessages = new Set<string>(
  Object.values(CONVERSATION_SYSTEM_MESSAGES),
);

export const isConversationSystemMessage = (
  text: string | null | undefined,
): boolean =>
  typeof text === "string" && conversationSystemMessages.has(text.trim());
