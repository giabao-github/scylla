import { ConvexError, v } from "convex/values";

import { QueryCtx, internalQuery } from "@workspace/backend/_generated/server";

export const getConversationByThreadId = async (
  ctx: QueryCtx,
  threadId: string,
) => {
  return ctx.db
    .query("conversations")
    .withIndex("by_thread_id", (q) => q.eq("threadId", threadId))
    .unique();
};

export const requireConversationByThreadId = async (
  ctx: QueryCtx,
  threadId: string,
) => {
  const conversation = await getConversationByThreadId(ctx, threadId);

  if (!conversation) {
    throw new ConvexError({
      code: "CONVERSATION_NOT_FOUND",
      message: "Conversation not found",
      context: { threadId },
    });
  }

  return conversation;
};

export const getMessageRequest = async (ctx: QueryCtx, requestId: string) => {
  return ctx.db
    .query("messageRequests")
    .withIndex("by_request_id", (q) => q.eq("requestId", requestId))
    .unique();
};

export const requireMessageRequest = async (
  ctx: QueryCtx,
  requestId: string,
) => {
  const existing = await getMessageRequest(ctx, requestId);

  if (!existing) {
    throw new ConvexError({
      code: "MESSAGE_REQUEST_NOT_FOUND",
      message: "Message request not found",
      context: { requestId },
    });
  }

  return existing;
};
