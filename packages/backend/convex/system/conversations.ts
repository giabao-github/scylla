import { v } from "convex/values";

import { internalQuery } from "@workspace/backend/_generated/server";

export const getThreadById = internalQuery({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_thread_id", (query) => query.eq("threadId", args.threadId))
      .unique();

    return conversation;
  },
});
