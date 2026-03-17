import { internalMutation } from "@workspace/backend/_generated/server";

export const purgeExpiredContactSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredSessions = await ctx.db
      .query("contactSessions")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .take(100);

    const hasMore = expiredSessions.length === 100;
    let deleted = 0;

    for (const session of expiredSessions) {
      const conversations = await ctx.db
        .query("conversations")
        .withIndex("by_contact_session_id", (q) =>
          q.eq("contactSessionId", session._id),
        )
        .take(100);

      await Promise.all(conversations.map((c) => ctx.db.delete(c._id)));
      await ctx.db.delete(session._id);
      deleted++;
    }

    console.log(
      `Deleted ${deleted} expired contact sessions${hasMore ? " (more may remain)" : ""}`,
    );

    return { deleted, hasMore };
  },
});
