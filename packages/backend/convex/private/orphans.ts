import { v } from "convex/values";

import {
  internalMutation,
  internalQuery,
} from "@workspace/backend/_generated/server";

export const ORPHAN_BATCH_SIZE = 100;

export const markPendingOrphan = internalMutation({
  args: {
    storageId: v.id("_storage"),
    organizationId: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, { storageId, organizationId, createdAt }) => {
    const existing = await ctx.db
      .query("pendingOrphans")
      .withIndex("by_storage_id", (q) => q.eq("storageId", storageId))
      .unique();

    if (existing) return;

    await ctx.db.insert("pendingOrphans", {
      storageId,
      organizationId,
      createdAt,
    });
  },
});

export const resolveOrphan = internalMutation({
  args: {
    storageId: v.id("_storage"),
    entryId: v.string(),
  },
  handler: async (ctx, { storageId, entryId }) => {
    const row = await ctx.db
      .query("pendingOrphans")
      .withIndex("by_storage_id", (q) => q.eq("storageId", storageId))
      .unique();

    if (!row) return;

    await ctx.db.patch(row._id, { entryId });
  },
});

export const removePendingOrphan = internalMutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { storageId }) => {
    const row = await ctx.db
      .query("pendingOrphans")
      .withIndex("by_storage_id", (q) => q.eq("storageId", storageId))
      .unique();

    if (row) {
      await ctx.db.delete(row._id);
    }
  },
});

export const listStaleOrphans = internalQuery({
  args: { createdBefore: v.number() },
  handler: async (ctx, { createdBefore }) => {
    return await ctx.db
      .query("pendingOrphans")
      .withIndex("by_created_at", (q) => q.lt("createdAt", createdBefore))
      .take(ORPHAN_BATCH_SIZE);
  },
});
