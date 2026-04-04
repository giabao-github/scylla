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
      try {
        await Promise.all([
          row.storageId
            ? ctx.storage.delete(row.storageId).catch((err) => {
                if (!isNotFoundError(err)) throw err;
              })
            : Promise.resolve(),
          rag
            .deleteAsync(ctx, { entryId: row.entryId as EntryId })
            .catch((err) => {
              if (!isNotFoundError(err)) throw err;
            }),
        ]);

        await ctx.runMutation(internal.private.files.removePendingDeletion, {
          id: row._id,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const nextRetry = (row.retryCount ?? 0) + 1;
        console.error(
          `Deletion failed for row ${row._id} (attempt ${nextRetry}):`,
          errorMessage,
        );

        if (nextRetry >= MAX_RETRIES) {
          await ctx.runMutation(internal.private.files.moveToDeadLetterQueue, {
            id: row._id,
            error: errorMessage,
          });
        } else {
          await ctx.runMutation(internal.private.files.incrementRetryCount, {
            id: row._id,
            retryCount: nextRetry,
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
