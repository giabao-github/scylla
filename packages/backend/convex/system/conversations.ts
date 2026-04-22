import { ConvexError, v } from "convex/values";

import {
  internalMutation,
  internalQuery,
} from "@workspace/backend/_generated/server";
import { UPDATED_AT_THROTTLE_MS } from "@workspace/backend/constants";
import { supportAgent } from "@workspace/backend/system/ai/agents/supportAgent";
import {
  getConversationByThreadId,
  requireConversationByThreadId,
} from "@workspace/backend/system/utils";

import {
  CONVERSATION_STATUS,
  type ConversationStatus,
} from "@workspace/shared/types/conversation";

const assertValidTransition = (
  existing: ConversationStatus,
  status: ConversationStatus,
) => {
  const validTransitions: Record<
    ConversationStatus,
    readonly ConversationStatus[]
  > = {
    [CONVERSATION_STATUS.UNRESOLVED]: [
      CONVERSATION_STATUS.ESCALATED,
      CONVERSATION_STATUS.RESOLVED,
    ],
    [CONVERSATION_STATUS.ESCALATED]: [CONVERSATION_STATUS.RESOLVED],
    [CONVERSATION_STATUS.RESOLVED]: [CONVERSATION_STATUS.UNRESOLVED],
  };

  const allowed = validTransitions[existing];
  if (!allowed) {
    throw new ConvexError({
      code: "INVALID_STATUS_TRANSITION",
      message: "Unknown conversation status",
      context: { from: existing, to: status },
    });
  }

  if (!allowed.includes(status)) {
    throw new ConvexError({
      code: "INVALID_STATUS_TRANSITION",
      message: "Invalid conversation status transition",
      context: { from: existing, to: status },
    });
  }
};

export const getByThreadId = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, args) => getConversationByThreadId(ctx, args.threadId),
});

export const updateLastMessage = internalMutation({
  args: {
    threadId: v.string(),
    lastMessage: v.object({
      text: v.string(),
      role: v.union(v.literal("user"), v.literal("assistant")),
    }),
    messageAt: v.number(),
  },
  handler: async (ctx, args) => {
    const conversation = await requireConversationByThreadId(
      ctx,
      args.threadId,
    );

    const now = Date.now();
    if (args.messageAt > now) {
      console.warn("[updateLastMessage] future timestamp clamped", {
        threadId: args.threadId,
        original: args.messageAt,
        clamped: now,
      });
    }
    const messageAt = Math.min(args.messageAt, now);

    if (conversation.lastMessageAt && messageAt <= conversation.lastMessageAt) {
      console.warn("[updateLastMessage] stale message dropped", {
        threadId: args.threadId,
        incomingAt: messageAt,
        currentLastMessageAt: conversation.lastMessageAt,
      });
      if (now - (conversation.updatedAt ?? 0) > UPDATED_AT_THROTTLE_MS) {
        await ctx.db.patch(conversation._id, { updatedAt: now });
      }
      return;
    }

    await ctx.db.patch(conversation._id, {
      lastMessage: args.lastMessage,
      lastMessageAt: messageAt,
      updatedAt: now,
    });
  },
});

export const getLastAssistantMessage = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const result = await supportAgent.listMessages(ctx, {
      threadId,
      paginationOpts: { cursor: null, numItems: 20 },
    });

    for (let i = result.page.length - 1; i >= 0; i--) {
      const msg = result.page[i];
      if (
        msg &&
        msg.message?.role === "assistant" &&
        typeof msg.message?.content === "string" &&
        msg.message.content.trim()
      ) {
        return {
          text: msg.message.content,
          _creationTime: msg._creationTime,
        };
      }
    }

    return null;
  },
});

export const resolve = internalMutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await requireConversationByThreadId(
      ctx,
      args.threadId,
    );

    if (conversation.status === CONVERSATION_STATUS.RESOLVED) {
      return false;
    }
    assertValidTransition(conversation.status, CONVERSATION_STATUS.RESOLVED);

    await ctx.db.patch(conversation._id, {
      status: CONVERSATION_STATUS.RESOLVED,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const escalate = internalMutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await requireConversationByThreadId(
      ctx,
      args.threadId,
    );

    if (conversation.status === CONVERSATION_STATUS.ESCALATED) {
      return false;
    }
    assertValidTransition(conversation.status, CONVERSATION_STATUS.ESCALATED);

    await ctx.db.patch(conversation._id, {
      status: CONVERSATION_STATUS.ESCALATED,
      updatedAt: Date.now(),
    });

    return true;
  },
});
