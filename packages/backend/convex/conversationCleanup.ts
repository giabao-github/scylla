import { internal } from "@workspace/backend/_generated/api";
import { internalMutation } from "@workspace/backend/_generated/server";

const BATCH_SIZE = 100;

export const cleanupOrphanedConversations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const conversations = await ctx.db.query("conversations").take(BATCH_SIZE);
    let deleted = 0;

    for (const conversation of conversations) {
      try {
        const session = await ctx.db.get(conversation.contactSessionId);
        if (!session) {
          await ctx.db.delete(conversation._id);
          deleted++;
        }
      } catch (error) {
        console.error(
          `Failed to process conversation ${conversation._id}:`,
          error,
        );
      }
    }

    console.log(`Deleted ${deleted} orphaned conversations`);

    // Schedule another batch if we processed a full batch
    if (conversations.length === BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        0,
        internal.conversationCleanup.cleanupOrphanedConversations,
        {},
      );
    }
  },
});
