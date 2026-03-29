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

        return {
          url: existingStorageId
            ? await ctx.storage.getUrl(existingStorageId as Id<"_storage">)
            : null,
          entryId,
        };
      }

      return {
        url: await ctx.storage.getUrl(storageId),
        entryId,
      };
    } catch (error) {
      console.error("Failed to extract text content", error);
      await ctx.storage.delete(storageId);
      return {
        url: null,
        entryId: null,
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

    const namespace = await rag.getNamespace(ctx, {
      namespace: organizationId,
    });

    if (!namespace) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Namespace not found",
      });
    }

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

    if (entry.metadata?.storageId) {
      await ctx.storage.delete(entry.metadata.storageId as Id<"_storage">);
    }

    await rag.deleteAsync(ctx, {
      entryId,
    });
  },
});
