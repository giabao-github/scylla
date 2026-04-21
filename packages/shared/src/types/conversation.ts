export const CONVERSATION_STATUS = {
  UNRESOLVED: "unresolved",
  ESCALATED: "escalated",
  RESOLVED: "resolved",
} as const;

export type ConversationStatus =
  (typeof CONVERSATION_STATUS)[keyof typeof CONVERSATION_STATUS];
