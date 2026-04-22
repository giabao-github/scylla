import { Entry, EntryId, vEntryId } from "@convex-dev/rag";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import {
  QueryCtx,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "@workspace/backend/_generated/server";
import {
  cleanupFileIndices,
  getAuthenticatedOrganization,
  requireSubscriptionFeatureAccess,
} from "@workspace/backend/private/utils";
import rag from "@workspace/backend/system/ai/rag";

import { formatFileSize } from "@workspace/shared/lib/file";
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
  rawIsDone?: boolean;
  bufferedEntryIds?: string[];
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
      (typeof parsed.rawCursor === "string" || parsed.rawCursor === null) &&
      (parsed.rawIsDone === undefined ||
        typeof parsed.rawIsDone === "boolean") &&
      (parsed.bufferedEntryIds === undefined ||
        (Array.isArray(parsed.bufferedEntryIds) &&
          parsed.bufferedEntryIds.every(
            (id: unknown) => typeof id === "string",
          )))
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
    const { clerkOrganizationId } = await getAuthenticatedOrganization(ctx);
    const entry = await rag.getEntry(ctx, { entryId });

    if (!entry || entry.metadata?.uploadedBy !== clerkOrganizationId) {
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
    await requireSubscriptionFeatureAccess(ctx);
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
    const { clerkOrganizationId } = await requireSubscriptionFeatureAccess(ctx);

    const [hashMatch, nameMatch] = await Promise.all([
      ctx.db
        .query("contentHashes")
        .withIndex("by_org_id_and_hash", (q) =>
          q
            .eq("organizationId", clerkOrganizationId)
            .eq("contentHash", contentHash),
        )
        .first(),
      ctx.db
        .query("fileNameIndex")
        .withIndex("by_org_id_and_filename", (q) =>
          q.eq("organizationId", clerkOrganizationId).eq("filename", filename),
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
    const { clerkOrganizationId } = await requireSubscriptionFeatureAccess(ctx);
    const entry = await rag.getEntry(ctx, { entryId });

    if (!entry || entry.metadata?.uploadedBy !== clerkOrganizationId) {
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
    const contentHash = metadata?.contentHash;

    await ctx.db.insert("pendingDeletions", {
      filename: metadata?.filename ?? "",
      ...(contentHash !== undefined ? { contentHash } : {}),
      entryId,
      storageId,
      organizationId: clerkOrganizationId,
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

    const { clerkOrganizationId } = await requireSubscriptionFeatureAccess(ctx);

    const entries = await Promise.all(
      entryIds.map((entryId) => rag.getEntry(ctx, { entryId })),
    );

    for (const entry of entries) {
      if (!entry) continue;
      if (entry.metadata?.uploadedBy !== clerkOrganizationId) {
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
      const contentHash = metadata?.contentHash;

      await ctx.db.insert("pendingDeletions", {
        filename: metadata?.filename ?? "",
        ...(contentHash !== undefined ? { contentHash } : {}),
        entryId: entry.entryId,
        storageId,
        organizationId: clerkOrganizationId,
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
    const { clerkOrganizationId } = await getAuthenticatedOrganization(ctx);

    const namespace = await rag.getNamespace(ctx, {
      namespace: clerkOrganizationId,
    });

    if (!namespace) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    if (category) {
      let rawCursor: string | null = null;
      let rawIsDone = false;
      let bufferedEntryIds: string[] = [];

      const decoded = paginationOpts.cursor
        ? decodeFilteredCursor(paginationOpts.cursor)
        : null;
      if (decoded) {
        rawCursor = decoded.rawCursor;
        rawIsDone = decoded.rawIsDone ?? false;
        bufferedEntryIds = decoded.bufferedEntryIds ?? [];
      }

      const targetCount = paginationOpts.numItems;
      const matched: Entry[] = [];
      let cursor: string | null = rawCursor;
      let isDone = rawIsDone;
      const maxScan = 1000;
      let scanned = 0;

      const replacedEntryIds = new Set<string>();

      if (bufferedEntryIds.length > 0) {
        const bufferedEntries = await Promise.all(
          bufferedEntryIds.map((entryId) =>
            rag.getEntry(ctx, { entryId: entryId as EntryId }),
          ),
        );
        const bufferedPendingChecks = await Promise.all(
          bufferedEntries.map((entry) =>
            entry
              ? isPendingDeletion(ctx, entry.entryId)
              : Promise.resolve(false),
          ),
        );

        const remainingBufferedEntryIds: string[] = [];

        for (let idx = 0; idx < bufferedEntries.length; idx++) {
          const entry = bufferedEntries[idx];
          if (!entry) continue;
          if (bufferedPendingChecks[idx]) continue;
          if (
            (entry.metadata as EntryMetadata | undefined)?.category !== category
          ) {
            continue;
          }

          if (matched.length < targetCount) {
            matched.push(entry);
          } else {
            remainingBufferedEntryIds.push(entry.entryId);
          }
        }

        bufferedEntryIds = remainingBufferedEntryIds;
      }

      while (
        matched.length < targetCount &&
        bufferedEntryIds.length === 0 &&
        !isDone &&
        scanned < maxScan
      ) {
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
        const pendingChecks = await Promise.all(
          matched.map((e) => isPendingDeletion(ctx, e.entryId)),
        );
        for (let i = matched.length - 1; i >= 0; i--) {
          if (replacedEntryIds.has(matched[i]!.entryId) || pendingChecks[i]) {
            matched.splice(i, 1);
          }
        }

        const pagePendingChecks = await Promise.all(
          results.page.map((e) => isPendingDeletion(ctx, e.entryId)),
        );
        for (let idx = 0; idx < results.page.length; idx++) {
          const entry = results.page[idx]!;
          if (replacedEntryIds.has(entry.entryId)) continue;
          if (pagePendingChecks[idx]) continue;
          if (
            (entry.metadata as EntryMetadata | undefined)?.category === category
          ) {
            if (matched.length < targetCount) {
              matched.push(entry);
            } else {
              bufferedEntryIds.push(entry.entryId);
            }
          }
        }

        scanned += results.page.length;
        isDone = results.isDone;
        cursor = isDone ? null : results.continueCursor;
      }

      if (scanned >= maxScan && matched.length < targetCount) {
        console.warn(
          `Category filter scan hit maxScan (${maxScan}) for category "${category}". ` +
            `Matched ${matched.length}/${targetCount} requested.`,
        );
      }

      const nextCursor =
        isDone && bufferedEntryIds.length === 0
          ? ""
          : encodeFilteredCursor({
              __type: "filtered",
              rawCursor: cursor,
              rawIsDone: isDone,
              bufferedEntryIds,
            });

      const files = await Promise.all(
        matched.map((entry) => convertEntryToPublicFile(ctx, entry)),
      );

      return {
        page: files,
        isDone: isDone && bufferedEntryIds.length === 0,
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

    const result: Doc<"pendingDeletions">[] = [];
    let cursor: string | null = null;
    const batchSize = effectiveLimit * 2;
    const maxScans = 5;
    let scans = 0;

    while (result.length < effectiveLimit && scans < maxScans) {
      const batch = await ctx.db
        .query("pendingDeletions")
        .withIndex("by_scheduled_at", (q) => q.lte("scheduledAt", now))
        .paginate({ cursor, numItems: batchSize });

      for (const row of batch.page) {
        const isNotClaimed =
          row.claimedAt === undefined || row.claimedAt < staleThreshold;
        if (isNotClaimed) {
          result.push(row);
          if (result.length >= effectiveLimit) break;
        }
      }

      if (batch.isDone) break;
      cursor = batch.continueCursor;
      scans++;
    }

    if (scans >= maxScans && result.length < effectiveLimit) {
      console.warn(
        `listPendingDeletions hit maxScans (${maxScans}). ` +
          `Returned ${result.length}/${effectiveLimit} requested.`,
      );
    }

    return result;
  },
});

export const listPendingDeletionsByOrg = internalQuery({
  args: { clerkOrgId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { clerkOrgId, limit }) => {
    const effectiveLimit = Math.max(1, Math.min(limit ?? 200, 1000));
    const rows = await ctx.db
      .query("pendingDeletions")
      .withIndex("by_org_id", (q) => q.eq("organizationId", clerkOrgId))
      .take(effectiveLimit);

    if (rows.length >= effectiveLimit) {
      console.warn(
        `[listPendingDeletionsByOrg] hit limit (${effectiveLimit}) for organization [${clerkOrgId}]. Results may be truncated.`,
      );
    }

    return rows;
  },
});

export const listPendingDeletionsByFilename = internalQuery({
  args: {
    clerkOrgId: v.string(),
    filename: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pendingDeletions")
      .withIndex("by_org_id_and_filename", (q) =>
        q.eq("organizationId", args.clerkOrgId).eq("filename", args.filename),
      )
      .collect();
  },
});

export const listPendingDeletionsByHash = internalQuery({
  args: {
    clerkOrgId: v.string(),
    contentHash: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pendingDeletions")
      .withIndex("by_org_id_and_hash", (q) =>
        q
          .eq("organizationId", args.clerkOrgId)
          .eq("contentHash", args.contentHash),
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

export const backfillPendingDeletionContentHash = internalMutation({
  args: {
    id: v.id("pendingDeletions"),
    contentHash: v.string(),
  },
  handler: async (ctx, { id, contentHash }) => {
    const row = await ctx.db.get(id);
    if (!row || row.contentHash === contentHash) return;
    await ctx.db.patch(id, { contentHash });
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
    contentHash: v.optional(v.string()),
    entryId: v.string(),
    storageId: v.union(v.id("_storage"), v.null()),
    organizationId: v.string(),
  },
  handler: async (
    ctx,
    { filename, contentHash: incomingHash, entryId, storageId, organizationId },
  ) => {
    await cleanupFileIndices(ctx, entryId);

    const existingPending = await ctx.db
      .query("pendingDeletions")
      .withIndex("by_entry_id", (q) => q.eq("entryId", entryId))
      .unique();

    if (existingPending) return;

    let contentHash = incomingHash;
    if (!contentHash) {
      const entry = await rag.getEntry(ctx, { entryId: entryId as EntryId });
      contentHash = (entry?.metadata as EntryMetadata | undefined)?.contentHash;
    }

    await ctx.db.insert("pendingDeletions", {
      filename,
      ...(contentHash !== undefined ? { contentHash } : {}),
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
  },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (!row) return;
    await ctx.db.patch(id, { retryCount: (row.retryCount ?? 0) + 1 });
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
    replaceEntryId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { organizationId, filename, entryId, replaceEntryId },
  ) => {
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
      if (replaceEntryId && existing.entryId === replaceEntryId) {
        await ctx.db.patch(existing._id, { entryId });
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

    await ctx.db.patch(id, {
      claimedAt: now,
      scheduledAt: now + STALE_CLAIM_MS,
    });
    return { claimed: true };
  },
});
