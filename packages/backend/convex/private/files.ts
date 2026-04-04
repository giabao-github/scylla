import { Entry, EntryId, vEntryId } from "@convex-dev/rag";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { Id } from "@workspace/backend/_generated/dataModel";
import {
  QueryCtx,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "@workspace/backend/_generated/server";
import {
  cleanupFileIndices,
  getAuthenticatedOrgId,
} from "@workspace/backend/private/utils";
import rag from "@workspace/backend/system/ai/rag";

import { formatFileSize } from "@workspace/shared/lib/file-utils";
import { PublicFile } from "@workspace/shared/types/file";

type EntryMetadata = {
  storageId: Id<"_storage">;
  uploadedBy: string;
  filename: string;
  category: string | null;
  contentHash?: string;
  replacedEntryId?: string;
};

type FilteredCursor = {
  __type: "filtered";
  rawCursor: string | null;
};

const STALE_CLAIM_MS = 5 * 60 * 1000;

const isValidStorageId = (value: unknown): value is Id<"_storage"> => {
  return typeof value === "string" && value.length > 0;
};

const isPendingDeletion = async (
  ctx: QueryCtx,
  entryId: string,
): Promise<boolean> => {
  const row = await ctx.db
    .query("pendingDeletions")
    .withIndex("by_entry_id", (q) => q.eq("entryId", entryId))
    .unique();
  return row !== null;
};

const encodeFilteredCursor = (c: FilteredCursor): string => {
  const json = JSON.stringify(c);
  return btoa(encodeURIComponent(json));
};

const decodeFilteredCursor = (s: string): FilteredCursor | null => {
  try {
    const json = decodeURIComponent(atob(s));
    const parsed = JSON.parse(json);
    if (
      parsed?.__type === "filtered" &&
      (typeof parsed.rawCursor === "string" || parsed.rawCursor === null)
    ) {
      return parsed as FilteredCursor;
    }
    return null;
  } catch {
    return null;
  }
};

const convertEntryToPublicFile = async (
  ctx: QueryCtx,
  entry: Entry,
): Promise<PublicFile> => {
  const metadata = entry.metadata as EntryMetadata | undefined;

  if (metadata && (!metadata.storageId || !metadata.filename)) {
    console.warn(`Invalid metadata for entry [${entry.entryId}]`);
  }

  const storageId = metadata?.storageId;

  let fileSize = "unknown";

  if (isValidStorageId(storageId)) {
    try {
      const storageMetadata = await ctx.db.system.get(storageId);
      if (storageMetadata) {
        fileSize = formatFileSize(storageMetadata.size);
      } else {
        console.warn(`Storage metadata not found for storage [${storageId}]`);
      }
    } catch (error) {
      console.error("Failed to get storage metadata:", error);
    }
  }

  const filename = entry.key || "Unknown";
  const extension = filename.includes(".")
    ? filename.split(".").pop()?.toLowerCase() || "txt"
    : "txt";
  let status: "ready" | "processing" | "error" = "error";

  if (entry.status === "ready") {
    status = "ready";
  } else if (entry.status === "pending") {
    status = "processing";
  } else {
    console.warn(
      `Unexpected entry status: ${entry.status} for entry [${entry.entryId}]`,
    );
  }

  const url = isValidStorageId(storageId)
    ? await ctx.storage.getUrl(storageId)
    : null;

  return {
    id: entry.entryId,
    name: filename,
    type: extension,
    size: fileSize,
    status,
    url,
    category: metadata?.category ?? undefined,
  };
};

export const getFileUrl = query({
  args: {
    entryId: vEntryId,
  },
  handler: async (ctx, { entryId }) => {
    const { organizationId } = await getAuthenticatedOrgId(ctx);
    const entry = await rag.getEntry(ctx, { entryId });

    if (!entry || entry.metadata?.uploadedBy !== organizationId) {
      return null;
    }

    const storageId = entry.metadata?.storageId;

    if (!isValidStorageId(storageId)) {
      return null;
    }

    return await ctx.storage.getUrl(storageId);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx): Promise<string> => {
    await getAuthenticatedOrgId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getByFilename = internalQuery({
  args: {
    organizationId: v.string(),
    filename: v.string(),
    excludeEntryId: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, filename, excludeEntryId }) => {
    const row = await ctx.db
      .query("fileNameIndex")
      .withIndex("by_org_id_and_filename", (q) =>
        q.eq("organizationId", organizationId).eq("filename", filename),
      )
      .first();

    if (!row || row.entryId === excludeEntryId) return null;
    return row;
  },
});

export const checkForDuplicate = query({
  args: {
    contentHash: v.string(),
    filename: v.string(),
  },
  handler: async (ctx, { contentHash, filename }) => {
    const { organizationId } = await getAuthenticatedOrgId(ctx);

    const [hashMatch, nameMatch] = await Promise.all([
      ctx.db
        .query("contentHashes")
        .withIndex("by_org_id_and_hash", (q) =>
          q.eq("organizationId", organizationId).eq("contentHash", contentHash),
        )
        .first(),
      ctx.db
        .query("fileNameIndex")
        .withIndex("by_org_id_and_filename", (q) =>
          q.eq("organizationId", organizationId).eq("filename", filename),
        )
        .first(),
    ]);

    return {
      contentDuplicate: hashMatch ? (hashMatch.entryId as EntryId) : null,
      nameConflict: nameMatch ? (nameMatch.entryId as EntryId) : null,
    };
  },
});

export const deleteFile = mutation({
  args: {
    entryId: vEntryId,
  },
  handler: async (ctx, { entryId }) => {
    const { organizationId } = await getAuthenticatedOrgId(ctx);
    const entry = await rag.getEntry(ctx, { entryId });

    if (!entry || entry.metadata?.uploadedBy !== organizationId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Entry not found",
      });
    }

    const existingPending = await ctx.db
      .query("pendingDeletions")
      .withIndex("by_entry_id", (q) => q.eq("entryId", entryId))
      .unique();

    if (existingPending) {
      return;
    }

    const metadata = entry.metadata as EntryMetadata | undefined;
    await cleanupFileIndices(ctx, entryId);

    const storageId = isValidStorageId(metadata?.storageId)
      ? metadata.storageId
      : null;

    await ctx.db.insert("pendingDeletions", {
      filename: metadata?.filename ?? "",
      entryId,
      storageId,
      organizationId,
      scheduledAt: Date.now(),
    });
  },
});

export const deleteFiles = mutation({
  args: {
    entryIds: v.array(vEntryId),
  },
  handler: async (ctx, { entryIds }) => {
    if (entryIds.length > 100) {
      throw new ConvexError({
        code: "INVALID_INPUT",
        message: "Cannot delete more than 100 files at once",
      });
    }

    const { organizationId } = await getAuthenticatedOrgId(ctx);

    const entries = await Promise.all(
      entryIds.map((entryId) => rag.getEntry(ctx, { entryId })),
    );

    for (const entry of entries) {
      if (!entry) continue;
      if (entry.metadata?.uploadedBy !== organizationId) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Entry not found",
        });
      }
    }

    let skippedDueToPending = 0;
    for (const entry of entries) {
      if (!entry) continue;
      const metadata = entry.metadata as EntryMetadata | undefined;

      const existingPending = await ctx.db
        .query("pendingDeletions")
        .withIndex("by_entry_id", (q) => q.eq("entryId", entry.entryId))
        .unique();

      if (existingPending) {
        skippedDueToPending++;
        continue;
      }

      await cleanupFileIndices(ctx, entry.entryId);

      const storageId = isValidStorageId(metadata?.storageId)
        ? metadata.storageId
        : null;

      await ctx.db.insert("pendingDeletions", {
        filename: metadata?.filename ?? "",
        entryId: entry.entryId,
        storageId,
        organizationId,
        scheduledAt: Date.now(),
      });
    }

    const notFound = entries.filter((e) => e === null).length;
    return {
      deleted: entries.length - notFound - skippedDueToPending,
      skipped: notFound + skippedDueToPending,
    };
  },
});

export const list = query({
  args: {
    category: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { category, paginationOpts }) => {
    const { organizationId } = await getAuthenticatedOrgId(ctx);

    const namespace = await rag.getNamespace(ctx, {
      namespace: organizationId,
    });

    if (!namespace) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    if (category) {
      let rawCursor: string | null = null;

      const decoded = paginationOpts.cursor
        ? decodeFilteredCursor(paginationOpts.cursor)
        : null;
      if (decoded) {
        rawCursor = decoded.rawCursor;
      }

      const targetCount = paginationOpts.numItems;
      const matched: Entry[] = [];
      let cursor: string | null = rawCursor;
      let isDone = false;
      const maxScan = 1000;
      let scanned = 0;

      const replacedEntryIds = new Set<string>();

      do {
        const batchSize = Math.max(targetCount * 2, 50);
        const results = await rag.list(ctx, {
          namespaceId: namespace.namespaceId,
          paginationOpts: { cursor, numItems: batchSize },
        });

        // First pass: collect all replacements from this batch
        for (const entry of results.page) {
          const replacedId = (entry.metadata as any)?.replacedEntryId;
          if (replacedId) replacedEntryIds.add(replacedId);
        }

        // Remove items matched in earlier batches that are now known replaced.
        for (let i = matched.length - 1; i >= 0; i--) {
          if (
            replacedEntryIds.has(matched[i]!.entryId) ||
            (await isPendingDeletion(ctx, matched[i]!.entryId))
          ) {
            matched.splice(i, 1);
          }
        }

        for (const entry of results.page) {
          if (replacedEntryIds.has(entry.entryId)) continue;
          if (await isPendingDeletion(ctx, entry.entryId)) continue;
          if (
            (entry.metadata as EntryMetadata | undefined)?.category === category
          ) {
            if (matched.length < targetCount) {
              matched.push(entry);
            }
          }
        }

        scanned += results.page.length;
        isDone = results.isDone;
        cursor = isDone ? null : results.continueCursor;
      } while (matched.length < targetCount && !isDone && scanned < maxScan);

      if (scanned >= maxScan && matched.length < targetCount) {
        console.warn(
          `Category filter scan hit maxScan (${maxScan}) for category "${category}". ` +
            `Matched ${matched.length}/${targetCount} requested.`,
        );
      }

      const nextCursor = isDone
        ? ""
        : encodeFilteredCursor({
            __type: "filtered",
            rawCursor: cursor,
          });

      const files = await Promise.all(
        matched.map((entry) => convertEntryToPublicFile(ctx, entry)),
      );

      return {
        page: files,
        isDone,
        continueCursor: nextCursor,
      };
    }

    const results = await rag.list(ctx, {
      namespaceId: namespace.namespaceId,
      paginationOpts,
    });

    const replacedEntryIds = new Set(
      results.page
        .map((e) => (e.metadata as any)?.replacedEntryId)
        .filter(Boolean),
    );

    const visibleEntries = await Promise.all(
      results.page
        .filter((entry) => !replacedEntryIds.has(entry.entryId))
        .map(async (entry) => {
          const pending = await isPendingDeletion(ctx, entry.entryId);
          return pending ? null : entry;
        }),
    );

    const files = await Promise.all(
      visibleEntries
        .filter((e): e is Entry => e !== null)
        .map((entry) => convertEntryToPublicFile(ctx, entry)),
    );

    return {
      page: files,
      isDone: results.isDone,
      continueCursor: results.continueCursor,
    };
  },
});

export const listPendingDeletions = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const effectiveLimit = Math.max(1, Math.min(args.limit ?? 100, 1000));
    const now = Date.now();
    const staleThreshold = now - STALE_CLAIM_MS;

    const rows = await ctx.db
      .query("pendingDeletions")
      .order("asc")
      .take(effectiveLimit * 3);

    return rows
      .filter((r) => r.claimedAt === undefined || r.claimedAt < staleThreshold)
      .slice(0, effectiveLimit);
  },
});

export const listPendingDeletionsByOrg = internalQuery({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("pendingDeletions")
      .withIndex("by_org_id", (q) => q.eq("organizationId", organizationId))
      .collect();
  },
});

export const listPendingDeletionsByFilename = internalQuery({
  args: {
    organizationId: v.string(),
    filename: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pendingDeletions")
      .withIndex("by_org_id_and_filename", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("filename", args.filename),
      )
      .collect();
  },
});

export const deleteFileNameByEntryId = internalMutation({
  args: { entryId: v.string() },
  handler: async (ctx, { entryId }) => {
    const row = await ctx.db
      .query("fileNameIndex")
      .withIndex("by_entry_id", (q) => q.eq("entryId", entryId))
      .unique();

    if (row) {
      await ctx.db.delete(row._id);
    }
  },
});

export const removePendingDeletion = internalMutation({
  args: { id: v.id("pendingDeletions") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const removePendingDeletionByEntryId = internalMutation({
  args: { entryId: v.string() },
  handler: async (ctx, { entryId }) => {
    const row = await ctx.db
      .query("pendingDeletions")
      .withIndex("by_entry_id", (q) => q.eq("entryId", entryId))
      .unique();
    if (row) {
      await ctx.db.delete(row._id);
    }
  },
});

export const cleanupIndicesByEntryId = internalMutation({
  args: { entryId: v.string() },
  handler: async (ctx, { entryId }) => {
    await cleanupFileIndices(ctx, entryId);
  },
});

export const markPendingDeletion = internalMutation({
  args: {
    filename: v.string(),
    entryId: v.string(),
    storageId: v.union(v.id("_storage"), v.null()),
    organizationId: v.string(),
  },
  handler: async (ctx, { filename, entryId, storageId, organizationId }) => {
    await cleanupFileIndices(ctx, entryId);

    const existingPending = await ctx.db
      .query("pendingDeletions")
      .withIndex("by_entry_id", (q) => q.eq("entryId", entryId))
      .unique();

    if (existingPending) return;

    await ctx.db.insert("pendingDeletions", {
      filename,
      entryId,
      storageId,
      organizationId,
      scheduledAt: Date.now(),
    });
  },
});

export const incrementRetryCount = internalMutation({
  args: {
    id: v.id("pendingDeletions"),
    retryCount: v.number(),
  },
  handler: async (ctx, { id, retryCount }) => {
    await ctx.db.patch(id, { retryCount });
  },
});

export const moveToDeadLetterQueue = internalMutation({
  args: {
    id: v.id("pendingDeletions"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const pending = await ctx.db.get(args.id);
    if (!pending) return;

    await ctx.db.insert("failedDeletions", {
      entryId: pending.entryId,
      storageId: pending.storageId,
      organizationId: pending.organizationId,
      filename: pending.filename,
      error: args.error,
      failedAt: Date.now(),
    });

    await ctx.db.delete(args.id);
  },
});

export const claimFileName = internalMutation({
  args: {
    organizationId: v.string(),
    filename: v.string(),
    entryId: v.string(),
  },
  handler: async (ctx, { organizationId, filename, entryId }) => {
    const existing = await ctx.db
      .query("fileNameIndex")
      .withIndex("by_org_id_and_filename", (q) =>
        q.eq("organizationId", organizationId).eq("filename", filename),
      )
      .first();

    if (existing) {
      if (existing.entryId === entryId) {
        return { success: true };
      }
      return { success: false, conflictEntryId: existing.entryId };
    }

    await ctx.db.insert("fileNameIndex", {
      organizationId,
      filename,
      entryId,
    });

    return { success: true };
  },
});

export const claimContentHash = internalMutation({
  args: {
    organizationId: v.string(),
    contentHash: v.string(),
    entryId: v.string(),
  },
  handler: async (ctx, { organizationId, contentHash, entryId }) => {
    const existing = await ctx.db
      .query("contentHashes")
      .withIndex("by_org_id_and_hash", (q) =>
        q.eq("organizationId", organizationId).eq("contentHash", contentHash),
      )
      .first();

    if (existing) {
      if (existing.entryId === entryId) return { success: true };
      return { success: false, conflictEntryId: existing.entryId };
    }

    await ctx.db.insert("contentHashes", {
      organizationId,
      contentHash,
      entryId,
    });
    return { success: true };
  },
});

export const claimPendingDeletion = internalMutation({
  args: { id: v.id("pendingDeletions") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (!row) return { claimed: false };

    const now = Date.now();
    const isAlreadyClaimed =
      row.claimedAt !== undefined && now - row.claimedAt < STALE_CLAIM_MS;

    if (isAlreadyClaimed) return { claimed: false };

    await ctx.db.patch(id, { claimedAt: now });
    return { claimed: true };
  },
});
