import { EntryId } from "@convex-dev/rag";

import { internal } from "@workspace/backend/_generated/api";
import { internalAction } from "@workspace/backend/_generated/server";
import rag from "@workspace/backend/system/ai/rag";

const BATCH_SIZE = 20;

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
        if (row.storageId) {
          try {
            await ctx.storage.delete(row.storageId);
          } catch (storageErr) {
            console.warn(
              `Storage ID ${row.storageId} already deleted or not found.`,
            );
          }
        }

        await ctx.runMutation(
          internal.private.contentHashIndex.deleteByEntryId,
          {
            entryId: row.entryId,
          },
        );

        await rag.deleteAsync(ctx, { entryId: row.entryId as EntryId });

        await ctx.runMutation(internal.private.files.removePendingDeletion, {
          id: row._id,
        });
      } catch (error) {
        console.error(`Failed to clean up ${row.entryId}, will retry:`, error);
      }
    }

    if (pending.length === BATCH_SIZE) {
      await ctx.runAction(internal.pendingDeletions.processPendingDeletions);
    }
  },
});
