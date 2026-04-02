"use node";

import {
  contentHashFromArrayBuffer,
  guessMimeTypeFromExtension,
  vEntryId,
} from "@convex-dev/rag";
import { v } from "convex/values";

import { internal } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { action } from "@workspace/backend/_generated/server";
import { extractTextContent } from "@workspace/backend/lib/extractTextContent";
import { getAuthenticatedOrgId } from "@workspace/backend/private/utils";
import rag from "@workspace/backend/system/ai/rag";

import { EntryId } from "@workspace/shared/types/file";

type EntryMetadata = {
  storageId: Id<"_storage">;
  uploadedBy: string;
  filename: string;
  category: string | null;
  contentHash?: string;
};

type AddFileResult =
  | {
      status: "success";
      url: string | null;
      entryId: EntryId;
      error: null;
    }
  | {
      status: "name_conflict";
      existingEntryId: EntryId;
      url: null;
      entryId: null;
      error: null;
    }
  | {
      status: "content_duplicate";
      url: null;
      entryId: EntryId;
      error: null;
    }
  | {
      status: "error";
      url: null;
      entryId: null;
      error: string;
    };

type UpdateFileResult =
  | {
      status: "success";
      error: null;
    }
  | {
      status: "name_conflict";
      error: null;
    }
  | {
      status: "error";
      error: string;
    };

const isValidStorageId = (value: unknown): value is Id<"_storage"> => {
  return typeof value === "string" && value.length > 0;
};

export const addFile = action({
  args: {
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.optional(v.string()),
    category: v.optional(v.string()),
    overrideEntryId: v.optional(vEntryId),
  },
  handler: async (ctx, args): Promise<AddFileResult> => {
    const { organizationId } = await getAuthenticatedOrgId(ctx);
    const { storageId, filename, category } = args;

    const namespace = await rag.getNamespace(ctx, {
      namespace: organizationId,
    });

    // Step 1: Name collision check (skipped for override)
    if (namespace && !args.overrideEntryId) {
      let cursor: string | null = null;
      let nameCollisionEntryId: EntryId | null = null;
      outer: do {
        const page = await rag.list(ctx, {
          namespaceId: namespace.namespaceId,
          paginationOpts: { cursor, numItems: 100 },
        });
        for (const entry of page.page) {
          if (entry.key === filename) {
            nameCollisionEntryId = entry.entryId;
            break outer;
          }
        }
        cursor = page.isDone ? null : page.continueCursor;
      } while (cursor !== null);

      if (nameCollisionEntryId) {
        await ctx.storage.delete(storageId);
        return {
          status: "name_conflict" as const,
          existingEntryId: nameCollisionEntryId,
          url: null,
          entryId: null,
          error: null,
        };
      }
    }

    // Step 2: Override path — validate the target entry still exists
    if (args.overrideEntryId) {
      const oldEntry = await rag.getEntry(ctx, {
        entryId: args.overrideEntryId,
      });
      if (!oldEntry) {
        await ctx.storage.delete(storageId);
        return {
          status: "error" as const,
          url: null,
          entryId: null,
          error: "The file you're trying to replace no longer exists.",
        };
      }
    }

    const fileUrl = await ctx.storage.getUrl(storageId);
    if (!fileUrl) {
      return {
        status: "error" as const,
        url: null,
        entryId: null,
        error: "Uploaded file could not be found in storage.",
      };
    }

    const mimeType =
      args.mimeType ||
      guessMimeTypeFromExtension(filename) ||
      "application/octet-stream";

    const response = await fetch(fileUrl);
    if (!response.ok) {
      await ctx.storage.delete(storageId);
      return {
        status: "error" as const,
        url: null,
        entryId: null,
        error: "Failed to fetch file from storage.",
      };
    }

    const buffer = await response.arrayBuffer();
    const contentHash = await contentHashFromArrayBuffer(buffer);

    // Step 3: O(1) content duplicate check via index table
    if (contentHash) {
      const hashMatch = await ctx.runQuery(
        internal.private.contentHashIndex.getByHash,
        {
          organizationId,
          contentHash: contentHash as string,
          excludeEntryId: args.overrideEntryId,
        },
      );

      if (hashMatch) {
        const existingEntry = await rag.getEntry(ctx, {
          entryId: hashMatch.entryId as EntryId,
        });

        if (!existingEntry) {
          await ctx.runMutation(
            internal.private.contentHashIndex.deleteByEntryId,
            { entryId: hashMatch.entryId },
          );
        } else {
          await ctx.storage.delete(storageId);
          return {
            status: "content_duplicate" as const,
            url: null,
            entryId: hashMatch.entryId as EntryId,
            error: null,
          };
        }
      }
    }

    // Step 4: Normal upload path
    try {
      const text = await extractTextContent(ctx, {
        storageId,
        filename,
        mimeType,
      });

      const { entryId, created } = await rag.add(ctx, {
        namespace: organizationId,
        text,
        key: filename,
        title: filename,
        metadata: {
          storageId,
          uploadedBy: organizationId,
          filename,
          category: category ?? null,
          contentHash,
        } as EntryMetadata,
      });

      if (!created) {
        await ctx.storage.delete(storageId);
        return {
          status: "error" as const,
          url: null,
          entryId: null,
          error: "Failed to create entry.",
        };
      }

      if (args.overrideEntryId) {
        await ctx.runMutation(
          internal.private.contentHashIndex.deleteByEntryId,
          { entryId: args.overrideEntryId },
        );
      }

      if (contentHash) {
        await ctx.runMutation(internal.private.contentHashIndex.upsert, {
          organizationId,
          contentHash: contentHash as string,
          entryId,
        });
      }

      return {
        status: "success" as const,
        url: await ctx.storage.getUrl(storageId),
        entryId,
        error: null,
      };
    } catch (error) {
      await ctx.storage.delete(storageId);
      return {
        status: "error" as const,
        url: null,
        entryId: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

export const updateFile = action({
  args: {
    entryId: vEntryId,
    filename: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<UpdateFileResult> => {
    const { organizationId } = await getAuthenticatedOrgId(ctx);

    const entry = await rag.getEntry(ctx, { entryId: args.entryId });

    if (!entry) {
      return { status: "error" as const, error: "File not found" };
    }

    const metadata = entry.metadata as EntryMetadata | undefined;

    if (metadata?.uploadedBy !== organizationId) {
      return { status: "error" as const, error: "Unauthorized" };
    }

    const newFilename = args.filename ?? entry.key ?? metadata?.filename;
    if (!newFilename) {
      return { status: "error" as const, error: "Filename is required" };
    }

    const newCategory =
      args.category !== undefined
        ? args.category || null
        : (metadata?.category ?? null);

    if (args.filename && args.filename !== entry.key) {
      const namespace = await rag.getNamespace(ctx, {
        namespace: organizationId,
      });

      if (namespace) {
        let cursor: string | null = null;
        let hasConflict = false;

        outer: do {
          const page = await rag.list(ctx, {
            namespaceId: namespace.namespaceId,
            paginationOpts: { cursor, numItems: 100 },
          });
          for (const e of page.page) {
            if (e.key === args.filename && e.entryId !== args.entryId) {
              hasConflict = true;
              break outer;
            }
          }
          cursor = page.isDone ? null : page.continueCursor;
        } while (cursor !== null);

        if (hasConflict) {
          return { status: "name_conflict" as const, error: null };
        }
      }
    }

    const storageId = metadata?.storageId;
    if (!storageId || !isValidStorageId(storageId)) {
      return {
        status: "error" as const,
        error: "Legacy file without storage cannot be updated",
      };
    }

    const url = await ctx.storage.getUrl(storageId);
    if (!url) {
      return { status: "error" as const, error: "File not found in storage" };
    }

    try {
      const mimeType =
        guessMimeTypeFromExtension(newFilename) || "application/octet-stream";

      const text = await extractTextContent(ctx, {
        storageId,
        filename: newFilename,
        mimeType,
      });

      const { entryId: newEntryId, created } = await rag.add(ctx, {
        namespace: organizationId,
        text,
        key: newFilename,
        title: newFilename,
        contentHash: metadata?.contentHash,
        metadata: {
          ...metadata,
          filename: newFilename,
          category: newCategory,
        } as EntryMetadata,
      });

      if (!created) {
        return {
          status: "error" as const,
          error: "Failed to create updated entry",
        };
      }

      if (metadata?.contentHash) {
        await ctx.runMutation(internal.private.contentHashIndex.upsert, {
          organizationId,
          contentHash: metadata.contentHash,
          entryId: newEntryId,
        });
      }

      await rag.deleteAsync(ctx, { entryId: args.entryId });
    } catch (error) {
      return {
        status: "error" as const,
        error: error instanceof Error ? error.message : "Failed to update file",
      };
    }

    return { status: "success" as const, error: null };
  },
});
