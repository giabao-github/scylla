import { EntryId } from "@convex-dev/rag";
import { VapiClient } from "@vapi-ai/server-sdk";
import type { UserIdentity } from "convex/server";
import { ConvexError } from "convex/values";
import z from "zod";

import { internal } from "@workspace/backend/_generated/api";
import { Doc } from "@workspace/backend/_generated/dataModel";
import {
  ActionCtx,
  type DatabaseReader,
  MutationCtx,
  QueryCtx,
} from "@workspace/backend/_generated/server";
import {
  getSecretValue,
  parseSecretString,
} from "@workspace/backend/lib/secrets";
import rag from "@workspace/backend/system/ai/rag";

import { isNotFoundError } from "@workspace/shared/lib/file-utils";

type EntryMetadata = {
  contentHash?: string;
};

type PluginService = "vapi";

interface OrgUserIdentity extends UserIdentity {
  orgId?: string;
}

interface ValidatedOrgUserIdentity extends UserIdentity {
  orgId: string;
}
interface AuthContext {
  auth: {
    getUserIdentity: () => Promise<OrgUserIdentity | null>;
  };
}

interface AuthDbContext extends AuthContext {
  db: DatabaseReader;
}

const asyncMapBatch = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    results.push(...(await Promise.all(chunk.map(fn))));
  }
  return results;
};

export const getAuthenticatedOrgId = async (
  ctx: AuthContext,
): Promise<{ identity: ValidatedOrgUserIdentity; organizationId: string }> => {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "User is not authenticated",
    });
  }

  if (!identity.orgId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not found",
    });
  }

  return {
    identity: identity as ValidatedOrgUserIdentity,
    organizationId: identity.orgId,
  };
};

export const getAuthenticatedOrg = async (
  ctx: AuthDbContext,
): Promise<{
  identity: ValidatedOrgUserIdentity;
  organization: Doc<"organizations">;
}> => {
  const { identity, organizationId: clerkOrgId } =
    await getAuthenticatedOrgId(ctx);

  const organization = await ctx.db
    .query("organizations")
    .withIndex("by_org_id", (q) => q.eq("organizationId", clerkOrgId))
    .unique();

  if (!organization) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not initialized",
    });
  }

  return { identity, organization };
};

export const cleanupFileIndices = async (ctx: MutationCtx, entryId: string) => {
  const hashRow = await ctx.db
    .query("contentHashes")
    .withIndex("by_entry_id", (q) => q.eq("entryId", entryId))
    .unique();
  if (hashRow) {
    await ctx.db.delete(hashRow._id);
  }

  const fileNameRow = await ctx.db
    .query("fileNameIndex")
    .withIndex("by_entry_id", (q) => q.eq("entryId", entryId))
    .unique();
  if (fileNameRow) {
    await ctx.db.delete(fileNameRow._id);
  }
};

export const cleanupPendingDeletions = async (
  ctx: ActionCtx,
  organizationId: string,
  filename: string,
  contentHash?: string,
): Promise<void> => {
  const [pendingNameMatches, pendingHashMatches, pendingOrgMatches] =
    await Promise.all([
      ctx.runQuery(internal.private.files.listPendingDeletionsByFilename, {
        organizationId,
        filename,
      }),
      contentHash
        ? ctx.runQuery(internal.private.files.listPendingDeletionsByHash, {
            organizationId,
            contentHash,
          })
        : Promise.resolve([] as Doc<"pendingDeletions">[]),
      contentHash
        ? ctx.runQuery(internal.private.files.listPendingDeletionsByOrg, {
            organizationId,
          })
        : Promise.resolve([] as Doc<"pendingDeletions">[]),
    ]);

  const seenEntryIds = new Set<string>();
  const uniquePending = [...pendingNameMatches, ...pendingHashMatches].filter(
    (p) => {
      if (seenEntryIds.has(p.entryId)) return false;
      seenEntryIds.add(p.entryId);
      return true;
    },
  );

  if (contentHash) {
    const pendingToHydrate = pendingOrgMatches.filter(
      (pending) => !pending.contentHash && !seenEntryIds.has(pending.entryId),
    );

    const hydratedHashMatches = await asyncMapBatch(
      pendingToHydrate,
      10,
      async (pending) => {
        try {
          const entry = await rag.getEntry(ctx, {
            entryId: pending.entryId as EntryId,
          });
          const pendingHash = (entry?.metadata as EntryMetadata | undefined)
            ?.contentHash;

          if (pendingHash) {
            await ctx.runMutation(
              internal.private.files.backfillPendingDeletionContentHash,
              {
                id: pending._id,
                contentHash: pendingHash,
              },
            );
          }

          if (pendingHash !== contentHash) {
            return null;
          }

          return {
            ...pending,
            contentHash: pendingHash,
          };
        } catch (error) {
          console.error(
            `Failed to hydrate content hash for pending deletion [${pending.entryId}]:`,
            error,
          );
          return null;
        }
      },
    );

    for (const pending of hydratedHashMatches) {
      if (!pending || seenEntryIds.has(pending.entryId)) continue;
      seenEntryIds.add(pending.entryId);
      uniquePending.push(pending);
    }
  }

  await asyncMapBatch(uniquePending, 10, async (pending) => {
    try {
      await rag
        .deleteAsync(ctx, { entryId: pending.entryId as EntryId })
        .catch((err) => {
          if (!isNotFoundError(err)) throw err;
          console.warn(
            `RAG entry [${pending.entryId}] already deleted, skipping.`,
          );
        });

      if (pending.storageId) {
        await ctx.storage.delete(pending.storageId).catch((err) => {
          if (!isNotFoundError(err)) throw err;
          console.warn(
            `Storage [${pending.storageId}] already deleted, skipping.`,
          );
        });
      }

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
  });
};

export const getPluginByOrgAndService = async (
  ctx: QueryCtx | MutationCtx,
  organizationId: string,
  service: PluginService,
) => {
  return ctx.db
    .query("plugins")
    .withIndex("by_org_id_and_service", (q) =>
      q.eq("organizationId", organizationId).eq("service", service),
    )
    .unique();
};

export const getVapiClient = async (ctx: ActionCtx): Promise<VapiClient> => {
  const { organizationId } = await getAuthenticatedOrgId(ctx);

  const plugin = await ctx.runQuery(
    internal.system.plugins.getByOrgIdAndService,
    {
      organizationId,
      service: "vapi",
    },
  );

  if (!plugin) {
    throw new ConvexError({
      code: "PLUGIN_NOT_FOUND",
      message: "Plugin not found",
    });
  }

  const secretValue = await getSecretValue(plugin.secretName);

  const parsedSecret = parseSecretString(
    secretValue,
    z.object({
      privateApiKey: z
        .string()
        .trim()
        .min(1, "Vapi private API key is required"),
    }),
  );

  if (!parsedSecret) {
    throw new ConvexError({
      code: "SECRET_NOT_FOUND",
      message: "Secret credentials not found",
    });
  }

  const vapiClient = new VapiClient({
    token: parsedSecret.privateApiKey,
  });

  return vapiClient;
};
