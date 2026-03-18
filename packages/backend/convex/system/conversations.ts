import { v } from "convex/values";

import type { QueryCtx } from "@workspace/backend/_generated/server";
import {
  internalMutation,
  internalQuery,
} from "@workspace/backend/_generated/server";

export const getThreadById = async (ctx: QueryCtx, threadId: string) => {
  return ctx.db
    .query("conversations")
    .withIndex("by_thread_id", (q) => q.eq("threadId", threadId))
    .unique();
};

export const getThreadByIdQuery = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, args) => getThreadById(ctx, args.threadId),
});

export const updateLastMessage = internalMutation({
  args: {
    threadId: v.string(),
    lastMessage: v.object({
      text: v.string(),
      role: v.union(v.literal("user"), v.literal("assistant")),
    }),
  },
  handler: async (ctx, args) => {
    const conversation = await getThreadById(ctx, args.threadId);

    if (!conversation) {
      console.error(
        `updateLastMessage: conversation not found for threadId '${args.threadId}'`,
      );
      return;
    }

    await ctx.db.patch(conversation._id, {
      lastMessage: args.lastMessage,
      updatedAt: Date.now(),
    });
  },
});
