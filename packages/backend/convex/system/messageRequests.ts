import { v } from "convex/values";

import { internalMutation } from "@workspace/backend/_generated/server";

export const claim = internalMutation({
  args: {
    requestId: v.string(),
    contactSessionId: v.optional(v.id("contactSessions")),
    conversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, { requestId, contactSessionId, conversationId }) => {
    if (!contactSessionId && !conversationId) {
      throw new Error(
        "Either contactSessionId or conversationId must be provided",
      );
    }

    const existing = await ctx.db
      .query("messageRequests")
      .withIndex("by_request_id", (q) => q.eq("requestId", requestId))
      .unique();

    if (existing) return { duplicate: true } as const;

    await ctx.db.insert("messageRequests", {
      requestId,
      contactSessionId,
      conversationId,
      createdAt: Date.now(),
    });

    return { duplicate: false } as const;
  },
});

export const release = internalMutation({
  args: { requestId: v.string() },
  handler: async (ctx, { requestId }) => {
    const existing = await ctx.db
      .query("messageRequests")
      .withIndex("by_request_id", (q) => q.eq("requestId", requestId))
      .unique();

    if (existing) await ctx.db.delete(existing._id);
  },
});

export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    const stale = await ctx.db
      .query("messageRequests")
      .withIndex("by_created_at", (q) => q.lt("createdAt", cutoff))
      .collect();

    await Promise.all(stale.map((r) => ctx.db.delete(r._id)));
  },
});
