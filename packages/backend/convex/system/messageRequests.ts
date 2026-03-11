import { v } from "convex/values";

import { internalMutation } from "@workspace/backend/_generated/server";

export const claim = internalMutation({
  args: {
    requestId: v.string(),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, { requestId, contactSessionId }) => {
    const existing = await ctx.db
      .query("messageRequests")
      .withIndex("by_request_id", (q) => q.eq("requestId", requestId))
      .unique();

    if (existing) return { duplicate: true } as const;

    await ctx.db.insert("messageRequests", {
      requestId,
      contactSessionId,
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
