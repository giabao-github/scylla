import { internalMutation } from "@workspace/backend/_generated/server";

/**
 * Deletes all contactSessions rows whose expiresAt timestamp is in the past.
 * Uses the "by_expires_at" index so only expired rows are scanned – no full
 * table scan required.
 */

export const purgeExpiredContactSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Efficiently collect every expired session via the index lt(now) keeps the scan to rows where expiresAt < now.
    const expiredSessions = await ctx.db
      .query("contactSessions")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .take(100);

    // Delete each expired row.
    await Promise.all(
      expiredSessions.map((session) => ctx.db.delete(session._id)),
    );

    console.log(
      `purgeExpiredContactSessions: deleted ${expiredSessions.length} expired session(s)`,
    );

    return { deleted: expiredSessions.length };
  },
});
