import { v } from "convex/values";

import { internal } from "@workspace/backend/_generated/api";
import { internalMutation } from "@workspace/backend/_generated/server";

const BATCH_SIZE = 100;

export const purgeExpiredContactSessions = internalMutation({
  args: {
    totalDeleted: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiredSessions = await ctx.db
      .query("contactSessions")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .take(BATCH_SIZE);

    const sessionIds = expiredSessions.map((s) => s._id);
    await Promise.all(expiredSessions.map((s) => ctx.db.delete(s._id)));

    if (sessionIds.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.conversationCleanup.cleanupOrphanedConversations,
        { sessionIds },
      );
    }

    const runningTotal = (args.totalDeleted ?? 0) + expiredSessions.length;

    if (expiredSessions.length === BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        0,
        internal.contactSessionCleanup.purgeExpiredContactSessions,
        { totalDeleted: runningTotal },
      );
    } else {
      console.log(
        `Purge complete. Total deleted: ${runningTotal} expired contact sessions`,
      );
    }

    return { deleted: expiredSessions.length };
  },
});
