import {
  contentHashFromArrayBuffer,
  guessMimeTypeFromContents,
  guessMimeTypeFromExtension,
  vEntryId,
} from "@convex-dev/rag";
import { ConvexError, v } from "convex/values";

import { Id } from "@workspace/backend/_generated/dataModel";
import { action, mutation } from "@workspace/backend/_generated/server";
import { extractTextContent } from "@workspace/backend/lib/extractTextContent";
import { getAuthenticatedOrgId } from "@workspace/backend/private/utils";
import rag from "@workspace/backend/system/ai/rag";

const guessMimeType = (filename: string, bytes: ArrayBuffer): string => {
  return (
    guessMimeTypeFromExtension(filename) ||
    guessMimeTypeFromContents(bytes) ||
    "application/octet-stream"
  );
};

const isValidStorageId = (value: unknown): value is Id<"_storage"> => {
  return typeof value === "string" && value.length > 0;
};

export const addFile = action({
  args: {
    filename: v.string(),
    mimeType: v.optional(v.string()),
    bytes: v.bytes(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthenticatedOrgId(ctx);

    const { bytes, filename, category } = args;
    const mimeType = args.mimeType || guessMimeType(filename, bytes);
    const blob = new Blob([bytes], { type: mimeType });

    const storageId = await ctx.storage.store(blob);

    try {
      const text = await extractTextContent(ctx, {
        storageId,
        filename,
        bytes,
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
        },
        contentHash: await contentHashFromArrayBuffer(bytes),
      });

      if (!created) {
        console.debug(
          `Entry [${entryId}] already exists for file [${filename}], skipping upload metadata`,
        );
        const entry = await rag.getEntry(ctx, { entryId });
        await ctx.storage.delete(storageId);
        const existingStorageId = entry?.metadata?.storageId;
        const validStorageId = isValidStorageId(existingStorageId)
          ? existingStorageId
          : null;

        return {
          url: validStorageId ? await ctx.storage.getUrl(validStorageId) : null,
          entryId,
          error: null,
        };
      }

      return {
        url: await ctx.storage.getUrl(storageId),
        entryId,
        error: null,
      };
    } catch (error) {
      console.error("Failed to extract text content", error);
      await ctx.storage.delete(storageId);
      return {
        url: null,
        entryId: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
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

    await rag.deleteAsync(ctx, {
      entryId,
    });

    const storageIdToDelete = entry.metadata?.storageId;

    if (isValidStorageId(storageIdToDelete)) {
      await ctx.storage.delete(storageIdToDelete);
    }
  },
});
