import { v } from "convex/values";

import { internal } from "@workspace/backend/_generated/api";
import { internalMutation } from "@workspace/backend/_generated/server";

const BATCH_SIZE = 100;

export const cleanupOrphanedConversations = internalMutation({
  args: {
    sessionIds: v.array(v.id("contactSessions")),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.cursor && args.sessionIds.length > 1) {
      throw new Error(
        "Argument 'cursor' can only be used with a single 'sessionId'",
      );
    }

    let deleted = 0;

    for (const sessionId of args.sessionIds) {
      const result = await ctx.db
        .query("conversations")
        .withIndex("by_contact_session_id", (q) =>
          q.eq("contactSessionId", sessionId),
        )
        .paginate({ numItems: BATCH_SIZE, cursor: args.cursor ?? null });

      await Promise.all(result.page.map((c) => ctx.db.delete(c._id)));
      deleted += result.page.length;

      if (!result.isDone) {
        await ctx.scheduler.runAfter(
          0,
          internal.conversationCleanup.cleanupOrphanedConversations,
          { sessionIds: [sessionId], cursor: result.continueCursor },
        );
      }
    }

    console.log(
      `Deleted ${deleted} orphaned conversations across ${args.sessionIds.length} sessions`,
    );

    return { deleted };
  },
});
