import { EntryId } from "@convex-dev/rag";

import { internal } from "@workspace/backend/_generated/api";
import { internalAction } from "@workspace/backend/_generated/server";
import rag from "@workspace/backend/system/ai/rag";

import { isNotFoundError } from "@workspace/shared/lib/file-utils";

const BATCH_SIZE = 20;
const MAX_RETRIES = 3;

export const processPendingDeletions = internalAction({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.runQuery(
      internal.private.files.listPendingDeletions,
      { limit: BATCH_SIZE },
    );

    if (pending.length === 0) return;

    for (const row of pending) {
      const { claimed } = await ctx.runMutation(
        internal.private.files.claimPendingDeletion,
        { id: row._id },
      );

      if (!claimed) {
        console.info(`Skipping already-claimed deletion [${row.entryId}]`);
        continue;
      }

      try {
        if (row.storageId) {
          await ctx.storage.delete(row.storageId).catch((err) => {
            if (!isNotFoundError(err)) throw err;
            console.warn(
              `Storage [${row.storageId}] already deleted, skipping.`,
            );
          });
        }
        await rag.deleteAsync(ctx, { entryId: row.entryId as EntryId });
        await ctx.runMutation(internal.private.files.removePendingDeletion, {
          id: row._id,
        });
      } catch (error) {
        console.error(`Failed to clean up ${row.entryId}, will retry:`, error);
        const nextRetryCount = (row.retryCount ?? 0) + 1;
        if (nextRetryCount > MAX_RETRIES) {
          await ctx.runMutation(internal.private.files.moveToDeadLetterQueue, {
            id: row._id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        } else {
          await ctx.runMutation(internal.private.files.incrementRetryCount, {
            id: row._id,
            retryCount: nextRetryCount,
          });
        }
      }
    }

    if (pending.length === BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        100,
        internal.pendingDeletions.processPendingDeletions,
        {},
      );
    }
  },
});
