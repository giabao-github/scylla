import { EntryId } from "@convex-dev/rag";

import { internal } from "@workspace/backend/_generated/api";
import { internalAction } from "@workspace/backend/_generated/server";
import rag from "@workspace/backend/system/ai/rag";

const isNotFoundError = (err: unknown): boolean => {
  const msg =
    err instanceof Error
      ? err.message.toLowerCase()
      : String(err).toLowerCase();
  return (
    msg.includes("not found") ||
    msg.includes("does not exist") ||
    msg.includes("storage object not found") ||
    msg.includes("no document")
  );
};

export const cleanupStaleOrphans = internalAction({
  args: {},
  handler: async (ctx) => {
    const ONE_HOUR_AGO = Date.now() - 60 * 60 * 1000;

    const stale = await ctx.runQuery(
      internal.private.orphans.listStaleOrphans,
      { createdBefore: ONE_HOUR_AGO },
    );

    for (const row of stale) {
      try {
        await Promise.all([
          row.entryId
            ? rag
                .deleteAsync(ctx, { entryId: row.entryId as EntryId })
                .catch((err) => {
                  if (isNotFoundError(err)) {
                    console.warn(
                      `RAG entry [${row.entryId}] already gone, skipping.`,
                    );
                  } else {
                    throw err;
                  }
                })
            : Promise.resolve(),
          ctx.storage.delete(row.storageId).catch((err) => {
            if (isNotFoundError(err)) {
              console.warn(
                `Storage [${row.storageId}] already deleted, skipping.`,
              );
            } else {
              throw err;
            }
          }),
        ]);

        await ctx.runMutation(internal.private.orphans.removePendingOrphan, {
          storageId: row.storageId,
        });
      } catch (error) {
        console.error(`Failed to clean up orphan [${row.storageId}]:`, error);
      }
    }
  },
});
