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

    let succeeded = 0;
    let deletionFailures = 0;
    let skipped = 0;

    const results = await Promise.allSettled(
      pending.map(async (row) => {
        const { claimed } = await ctx.runMutation(
          internal.private.conversations.claimPendingThreadDeletion,
          { id: row._id },
        );

        if (!claimed) {
          console.info(
            `Skipping already-claimed thread deletion [${row.threadId}]`,
          );
          skipped++;
          return;
        }

        try {
          await supportAgent.deleteThreadAsync(ctx, {
            threadId: row.threadId,
          });
          await ctx.runMutation(
            internal.private.conversations.removePendingThreadDeletion,
            { id: row._id },
          );
          succeeded++;
        } catch (error) {
          deletionFailures++;
          const currentRetryCount = row.retryCount ?? 0;
          const nextRetryCount = currentRetryCount + 1;

          console.error(
            `Failed to delete thread [${row.threadId}] (id=${row._id}, retry=${currentRetryCount}/${MAX_RETRIES}):`,
            error,
          );

          try {
            if (nextRetryCount > MAX_RETRIES) {
              await ctx.runMutation(
                internal.private.conversations
                  .movePendingThreadDeletionToDeadLetterQueue,
                {
                  id: row._id,
                  error: error instanceof Error ? error.message : String(error),
                },
              );
            } else {
              await ctx.runMutation(
                internal.private.conversations
                  .incrementPendingThreadDeletionRetryCount,
                { id: row._id },
              );
            }
          } catch (mutationError) {
            console.error(
              `Failed to update deletion state for thread [${row.threadId}] (id=${row._id}):`,
              mutationError,
            );
            throw mutationError;
          }
        }
      }),
    );

    const infrastructureFailures = results.filter(
      (r) => r.status === "rejected",
    ).length;
    if (deletionFailures > 0 || infrastructureFailures > 0) {
      console.warn(
        `Thread deletion batch: ${pending.length} total, ${skipped} skipped, ${succeeded} succeeded, ` +
          `${deletionFailures} deletion failures, ${infrastructureFailures} infrastructure failures`,
      );
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
