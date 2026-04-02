import { v } from "convex/values";

import {
  internalMutation,
  internalQuery,
} from "@workspace/backend/_generated/server";

export const getByHash = internalQuery({
  args: {
    organizationId: v.string(),
    contentHash: v.string(),
    excludeEntryId: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, contentHash, excludeEntryId }) => {
    const rows = await ctx.db
      .query("contentHashes")
      .withIndex("by_org_and_hash", (q) =>
        q.eq("organizationId", organizationId).eq("contentHash", contentHash),
      )
      .collect();

    return rows.find((r) => r.entryId !== excludeEntryId) ?? null;
  },
});

export const upsert = internalMutation({
  args: {
    organizationId: v.string(),
    contentHash: v.string(),
    entryId: v.string(),
  },
  handler: async (ctx, { organizationId, contentHash, entryId }) => {
    const existing = await ctx.db
      .query("contentHashes")
      .withIndex("by_org_and_hash", (q) =>
        q.eq("organizationId", organizationId).eq("contentHash", contentHash),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { entryId });
    } else {
      await ctx.db.insert("contentHashes", {
        organizationId,
        contentHash,
        entryId,
      });
    }
  },
});

export const deleteByEntryId = internalMutation({
  args: { entryId: v.string() },
  handler: async (ctx, { entryId }) => {
    const row = await ctx.db
      .query("contentHashes")
      .withIndex("by_entry_id", (q) => q.eq("entryId", entryId))
      .unique();

    if (row) {
      await ctx.db.delete(row._id);
    }
  },
});
