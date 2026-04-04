"use node";

import { guessMimeTypeFromExtension, vEntryId } from "@convex-dev/rag";
import { v } from "convex/values";

import { internal } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { action } from "@workspace/backend/_generated/server";
import { extractTextContent } from "@workspace/backend/lib/extractTextContent";
import { getAuthenticatedOrgId } from "@workspace/backend/private/utils";
import rag from "@workspace/backend/system/ai/rag";

import { isNotFoundError } from "@workspace/shared/lib/file-utils";
import { EntryId } from "@workspace/shared/types/file";

type EntryMetadata = {
  storageId: Id<"_storage">;
  uploadedBy: string;
  filename: string;
  category: string | null;
  contentHash?: string;
  mimeType?: string;
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
    contentHash: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<AddFileResult> => {
    const { organizationId } = await getAuthenticatedOrgId(ctx);
    const { storageId, filename, category, overrideEntryId, contentHash } =
      args;

    const oldEntry = overrideEntryId
      ? await rag.getEntry(ctx, { entryId: overrideEntryId })
      : null;

    if (
      overrideEntryId &&
      oldEntry &&
      oldEntry.metadata?.uploadedBy !== organizationId
    ) {
      await ctx.storage.delete(storageId);
      return {
        status: "error",
        url: null,
        entryId: null,
        error: "You do not have permission to replace this file.",
      };
    }

    const namespace = await rag.getNamespace(ctx, {
      namespace: organizationId,
    });

    // Step 1: Name collision check (O(1), skip for override)
    if (namespace && !overrideEntryId) {
      const collision = await ctx.runQuery(
        internal.private.files.getByFilename,
        {
          organizationId,
          filename,
          excludeEntryId: undefined,
        },
      );
      if (collision) {
        await ctx.storage.delete(storageId);
        return {
          status: "name_conflict",
          existingEntryId: collision.entryId as EntryId,
          url: null,
          entryId: null,
          error: null,
        };
      }
    }

    // Step 2: Content hash check (O(1), single check only)
    if (contentHash) {
      const hashMatch = await ctx.runQuery(
        internal.private.contentHashIndex.getByHash,
        { organizationId, contentHash, excludeEntryId: args.overrideEntryId },
      );
      if (hashMatch) {
        const existingEntry = await rag.getEntry(ctx, {
          entryId: hashMatch.entryId as EntryId,
        });
        if (existingEntry) {
          await ctx.storage.delete(storageId);
          return {
            status: "content_duplicate",
            url: null,
            entryId: hashMatch.entryId as EntryId,
            error: null,
          };
        }
        await ctx.runMutation(internal.private.files.cleanupIndicesByEntryId, {
          entryId: hashMatch.entryId,
        });
      }
    }

    // Step 3: Override — validate target still exists
    if (overrideEntryId && !oldEntry) {
      await ctx.storage.delete(storageId);
      return {
        status: "error",
        url: null,
        entryId: null,
        error: "The file you're trying to replace no longer exists.",
      };
    }

    // Step 4: Verify file is accessible — HEAD only, no body download
    const fileUrl = await ctx.storage.getUrl(storageId);
    if (!fileUrl) {
      await ctx.storage.delete(storageId);
      return {
        status: "error",
        url: null,
        entryId: null,
        error: "Uploaded file could not be found in storage.",
      };
    }

    try {
      const probe = await fetch(fileUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(10_000),
      });
      if (!probe.ok) {
        await ctx.storage.delete(storageId);
        return {
          status: "error",
          url: null,
          entryId: null,
          error: "Failed to access file in storage.",
        };
      }
    } catch {
      await ctx.storage.delete(storageId);
      return {
        status: "error",
        url: null,
        entryId: null,
        error: "Failed to reach storage.",
      };
    }

    const mimeType =
      args.mimeType ||
      guessMimeTypeFromExtension(filename) ||
      "application/octet-stream";

    // Step 5: Normal upload path
    let createdEntryId: string | null = null;
    try {
      if (!args.overrideEntryId && namespace) {
        const pendingMatches = await ctx.runQuery(
          internal.private.files.listPendingDeletionsByFilename,
          { organizationId, filename },
        );
        await Promise.all(
          pendingMatches.map(async (pending) => {
            try {
              await Promise.all([
                rag.deleteAsync(ctx, { entryId: pending.entryId as EntryId }),
                pending.storageId
                  ? ctx.storage.delete(pending.storageId).catch((err) => {
                      if (!isNotFoundError(err)) throw err;
                      console.warn(
                        `Storage [${pending.storageId}] already deleted, skipping.`,
                      );
                    })
                  : Promise.resolve(),
              ]);
              await ctx.runMutation(
                internal.private.files.removePendingDeletionByEntryId,
                { entryId: pending.entryId },
              );
            } catch (error) {
              console.error(
                `Failed to cleanup pending deletion for entry [${pending.entryId}]:`,
                error,
              );
            }
          }),
        );
      }

      await ctx.runMutation(internal.private.orphans.markPendingOrphan, {
        storageId,
        organizationId,
        createdAt: Date.now(),
      });

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
        contentHash,
        metadata: {
          storageId,
          uploadedBy: organizationId,
          filename,
          category: category ?? null,
          contentHash,
          mimeType,
          replacedEntryId: args.overrideEntryId,
        } as EntryMetadata,
      });

      if (!created) {
        await ctx
          .runMutation(internal.private.orphans.removePendingOrphan, {
            storageId,
          })
          .catch(() => {});
        await ctx.storage.delete(storageId);
        return {
          status: "error",
          url: null,
          entryId: null,
          error: "Failed to create entry.",
        };
      }

      createdEntryId = entryId;

      try {
        await ctx.runMutation(internal.private.orphans.resolveOrphan, {
          storageId,
          entryId,
        });
      } catch (resolveError) {
        console.error("Failed to resolve orphan:", resolveError);
      }

      if (contentHash) {
        const raceConditionMatch = await ctx.runQuery(
          internal.private.contentHashIndex.getByHash,
          { organizationId, contentHash, excludeEntryId: args.overrideEntryId },
        );

        if (raceConditionMatch) {
          await rag.deleteAsync(ctx, { entryId });
          await Promise.all([
            ctx
              .runMutation(internal.private.orphans.removePendingOrphan, {
                storageId,
              })
              .catch(() => {}),
            ctx.storage.delete(storageId).catch(() => {}),
          ]);
          return {
            status: "content_duplicate",
            url: null,
            entryId: raceConditionMatch.entryId as EntryId,
            error: null,
          };
        }
      }

      // Update indices synchronously
      await ctx.runMutation(internal.private.files.upsertFileName, {
        organizationId,
        filename,
        entryId,
      });

      if (contentHash) {
        await ctx.runMutation(internal.private.contentHashIndex.upsert, {
          organizationId,
          contentHash,
          entryId,
        });
      }

      if (args.overrideEntryId && oldEntry) {
        await ctx.runMutation(internal.private.files.markPendingDeletion, {
          filename: oldEntry.key ?? filename,
          entryId: args.overrideEntryId,
          storageId:
            (oldEntry.metadata as EntryMetadata | undefined)?.storageId ?? null,
          organizationId,
        });
      }

      await ctx
        .runMutation(internal.private.orphans.removePendingOrphan, {
          storageId,
        })
        .catch(() => {});

      return { status: "success", url: fileUrl, entryId, error: null };
    } catch (error) {
      await ctx.storage.delete(storageId).catch(() => {});
      await ctx
        .runMutation(internal.private.orphans.removePendingOrphan, {
          storageId,
        })
        .catch(() => {});

      if (createdEntryId) {
        await rag
          .deleteAsync(ctx, { entryId: createdEntryId as EntryId })
          .catch(() => {});
      }

      return {
        status: "error",
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

    const namespace = await rag.getNamespace(ctx, {
      namespace: organizationId,
    });

    const newCategory =
      args.category !== undefined
        ? args.category || null
        : (metadata?.category ?? null);
    const isRenaming = !!args.filename && args.filename !== entry.key;

    if (isRenaming && namespace) {
      const collision = await ctx.runQuery(
        internal.private.files.getByFilename,
        {
          organizationId,
          filename: newFilename,
          excludeEntryId: args.entryId,
        },
      );

      if (collision) {
        return { status: "name_conflict", error: null };
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

    let createdEntryId: string | null = null;
    try {
      if (isRenaming) {
        const pendingMatches = await ctx.runQuery(
          internal.private.files.listPendingDeletionsByFilename,
          { organizationId, filename: newFilename },
        );
        await Promise.all(
          pendingMatches.map(async (pending) => {
            try {
              await Promise.all([
                rag.deleteAsync(ctx, { entryId: pending.entryId as EntryId }),
                pending.storageId
                  ? ctx.storage.delete(pending.storageId).catch((err) => {
                      if (!isNotFoundError(err)) throw err;
                      console.warn(
                        `Storage [${pending.storageId}] already deleted, skipping.`,
                      );
                    })
                  : Promise.resolve(),
              ]);
              await ctx.runMutation(
                internal.private.files.removePendingDeletionByEntryId,
                { entryId: pending.entryId },
              );
            } catch (error) {
              console.error(
                `Failed to cleanup pending deletion for entry [${pending.entryId}]:`,
                error,
              );
            }
          }),
        );
      }

      const mimeType =
        metadata?.mimeType ||
        guessMimeTypeFromExtension(newFilename) ||
        "application/octet-stream";

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
          replacedEntryId: args.entryId,
        } as EntryMetadata,
      });

      if (!created) {
        throw new Error("Failed to create updated entry");
      }

      createdEntryId = newEntryId;

      await ctx.runMutation(internal.private.files.upsertFileName, {
        organizationId,
        filename: newFilename,
        entryId: newEntryId,
      });

      if (metadata?.contentHash) {
        await ctx.runMutation(internal.private.contentHashIndex.upsert, {
          organizationId,
          contentHash: metadata.contentHash,
          entryId: newEntryId,
        });
      }

      await ctx.runMutation(internal.private.files.markPendingDeletion, {
        filename: entry.key ?? newFilename,
        entryId: args.entryId,
        storageId: null,
        organizationId,
      });

      return { status: "success" as const, error: null };
    } catch (error) {
      if (createdEntryId) {
        await Promise.all([
          rag
            .deleteAsync(ctx, { entryId: createdEntryId as EntryId })
            .catch(() => {}),
          ctx
            .runMutation(internal.private.files.cleanupIndicesByEntryId, {
              entryId: createdEntryId,
            })
            .catch(() => {}),
        ]);
      }
      return {
        status: "error" as const,
        error: error instanceof Error ? error.message : "Failed to update file",
      };
    }
  },
});
