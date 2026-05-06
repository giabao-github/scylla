import { internal } from "@workspace/backend/_generated/api";
import { internalAction } from "@workspace/backend/_generated/server";
import { DELETION_BATCH_SIZE, MAX_RETRIES } from "@workspace/backend/constants";
import { supportAgent } from "@workspace/backend/system/ai/agents/supportAgent";

export const processPendingThreadDeletions = internalAction({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.runQuery(
      internal.private.conversations.listPendingThreadDeletions,
      { limit: DELETION_BATCH_SIZE },
    );

    if (pending.length === 0) return;

    for (const row of pending) {
      const { claimed } = await ctx.runMutation(
        internal.private.conversations.claimPendingThreadDeletion,
        { id: row._id },
      );

      if (!claimed) {
        console.info(
          `Skipping already-claimed thread deletion [${row.threadId}]`,
        );
        continue;
      }

      try {
        await supportAgent.deleteThreadAsync(ctx, { threadId: row.threadId });
        await ctx.runMutation(
          internal.private.conversations.removePendingThreadDeletion,
          { id: row._id },
        );
      } catch (error) {
        console.error(
          `Failed to schedule cleanup for thread [${row.threadId}], will retry:`,
          error,
        );

        const nextRetryCount = (row.retryCount ?? 0) + 1;

        if (nextRetryCount > MAX_RETRIES) {
          await ctx.runMutation(
            internal.private.conversations
              .movePendingThreadDeletionToDeadLetterQueue,
            {
              id: row._id,
              error: error instanceof Error ? error.message : "Unknown error",
            },
          );
        } else {
          await ctx.runMutation(
            internal.private.conversations
              .incrementPendingThreadDeletionRetryCount,
            { id: row._id },
          );
        }
      }
    }

    if (pending.length === DELETION_BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        100,
        internal.pendingThreadDeletions.processPendingThreadDeletions,
        {},
      );
    }
  },
});
