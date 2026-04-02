import { Entry, vEntryId } from "@convex-dev/rag";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { Id } from "@workspace/backend/_generated/dataModel";
import {
  QueryCtx,
  internalQuery,
  mutation,
  query,
} from "@workspace/backend/_generated/server";
import { getAuthenticatedOrgId } from "@workspace/backend/private/utils";
import rag from "@workspace/backend/system/ai/rag";

import { formatFileSize } from "@workspace/shared/lib/file-utils";
import { PublicFile } from "@workspace/shared/types/file";

type EntryMetadata = {
  storageId: Id<"_storage">;
  uploadedBy: string;
  filename: string;
  category: string | null;
  contentHash?: string;
};

type FilteredCursor = {
  __type: "filtered";
  rawCursor: string | null;
};

const isValidStorageId = (value: unknown): value is Id<"_storage"> => {
  return typeof value === "string" && value.length > 0;
};

const encodeFilteredCursor = (c: FilteredCursor) =>
  Buffer.from(JSON.stringify(c)).toString("base64");

const decodeFilteredCursor = (s: string): FilteredCursor | null => {
  try {
    const parsed = JSON.parse(Buffer.from(s, "base64").toString("utf8"));
    if (parsed?.__type === "filtered") {
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

  const url = storageId ? await ctx.storage.getUrl(storageId) : null;

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

    if (!entry) {
      return null;
    }

    if (entry.metadata?.uploadedBy !== organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Unauthorized to access this file",
      });
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

export const getStorageFileMeta = internalQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.db.system.get(args.storageId);
  },
});

export const deleteFile = mutation({
  args: {
    entryId: vEntryId,
  },
  handler: async (ctx, { entryId }) => {
    const { organizationId } = await getAuthenticatedOrgId(ctx);

    const entry = await rag.getEntry(ctx, { entryId });

    if (!entry) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Entry not found",
      });
    }

    if (entry.metadata?.uploadedBy !== organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Unauthorized to delete this file",
      });
    }

    const storageIdToDelete = entry.metadata?.storageId;

    if (isValidStorageId(storageIdToDelete)) {
      await ctx.storage.delete(storageIdToDelete);
    }

    const hashRow = await ctx.db
      .query("contentHashes")
      .withIndex("by_entry_id", (q) => q.eq("entryId", entryId))
      .unique();
    if (hashRow) {
      await ctx.db.delete(hashRow._id);
    }

    await rag.deleteAsync(ctx, {
      entryId,
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
    const failures: string[] = [];
    const entries = await Promise.all(
      entryIds.map((entryId) => rag.getEntry(ctx, { entryId })),
    );

    for (const entry of entries) {
      if (!entry) continue;
      if (entry.metadata?.uploadedBy !== organizationId) {
        throw new ConvexError({
          code: "UNAUTHORIZED",
          message: "Unauthorized to delete one or more files",
        });
      }
    }

    for (const entry of entries) {
      if (!entry) continue;
      try {
        const storageIdToDelete = entry.metadata?.storageId;
        if (isValidStorageId(storageIdToDelete)) {
          await ctx.storage.delete(storageIdToDelete);
        }
        const hashRow = await ctx.db
          .query("contentHashes")
          .withIndex("by_entry_id", (q) => q.eq("entryId", entry.entryId))
          .unique();
        if (hashRow) await ctx.db.delete(hashRow._id);
        await rag.deleteAsync(ctx, { entryId: entry.entryId });
      } catch (error) {
        if (error instanceof ConvexError) throw error;
        failures.push(entry.entryId);
      }
    }

    if (failures.length > 0) {
      console.error(`Failed to delete entries: ${failures.join(", ")}`);
      throw new ConvexError({
        code: "PARTIAL_FAILURE",
        message: `Failed to delete ${failures.length} of ${entryIds.length} files`,
        data: { failures },
      });
    }
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

      do {
        const batchSize = Math.max(targetCount * 2, 50);
        const results = await rag.list(ctx, {
          namespaceId: namespace.namespaceId,
          paginationOpts: { cursor, numItems: batchSize },
        });

        for (const entry of results.page) {
          if (
            (entry.metadata as EntryMetadata | undefined)?.category === category
          ) {
            matched.push(entry);
            if (matched.length === targetCount) break;
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

      const isReallyDone = matched.length < targetCount && isDone;

      const nextCursor = isReallyDone
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
        isDone: isReallyDone,
        continueCursor: nextCursor,
      };
    }

    const results = await rag.list(ctx, {
      namespaceId: namespace.namespaceId,
      paginationOpts,
    });

    const files = await Promise.all(
      results.page.map((entry) => convertEntryToPublicFile(ctx, entry)),
    );

    return {
      page: files,
      isDone: results.isDone,
      continueCursor: results.continueCursor,
    };
  },
});
