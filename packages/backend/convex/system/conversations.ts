import { v } from "convex/values";

import type { QueryCtx } from "@workspace/backend/_generated/server";
import { internalQuery } from "@workspace/backend/_generated/server";

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
