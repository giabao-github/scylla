import { EntryId } from "@convex-dev/rag";
import { VapiClient } from "@vapi-ai/server-sdk";
import type { UserIdentity } from "convex/server";
import { ConvexError } from "convex/values";
import z from "zod";

import { api, internal } from "@workspace/backend/_generated/api";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
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

import { isNotFoundError } from "@workspace/shared/lib/file";
import { hasSubscriptionFeatureAccess } from "@workspace/shared/lib/subscription";

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

type OrganizationLookupContext =
  | { db: DatabaseReader }
  | Pick<ActionCtx, "runQuery">;

type AuthenticatedOrganizationContext = AuthContext & OrganizationLookupContext;

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

export const getAuthenticatedIdentity = async (
  ctx: AuthContext,
): Promise<{
  identity: ValidatedOrgUserIdentity;
  clerkOrganizationId: string;
}> => {
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
    clerkOrganizationId: identity.orgId,
  };
};

const getOrganizationByClerkId = async (
  ctx: OrganizationLookupContext,
  clerkOrganizationId: string,
): Promise<Doc<"organizations"> | null> => {
  if ("db" in ctx) {
    return await ctx.db
      .query("organizations")
      .withIndex("by_org_id", (q) =>
        q.eq("organizationId", clerkOrganizationId),
      )
      .unique();
  }

  return await ctx.runQuery(api.public.organizations.getByClerkId, {
    clerkOrgId: clerkOrganizationId,
  });
};

export const getAuthenticatedOrganization = async (
  ctx: AuthenticatedOrganizationContext,
): Promise<{
  identity: ValidatedOrgUserIdentity;
  clerkOrganizationId: string;
  organizationId: Id<"organizations">;
  organization: Doc<"organizations">;
}> => {
  const { identity, clerkOrganizationId } = await getAuthenticatedIdentity(ctx);
  const organization = await getOrganizationByClerkId(ctx, clerkOrganizationId);

  if (!organization) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not initialized",
    });
  }

  return {
    identity,
    clerkOrganizationId,
    organizationId: organization._id,
    organization,
  };
};

const getSubscriptionByOrganizationId = async (
  ctx: OrganizationLookupContext,
  clerkOrganizationId: string,
): Promise<Doc<"subscriptions"> | null> => {
  if ("db" in ctx) {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_org_id", (q) =>
        q.eq("organizationId", clerkOrganizationId),
      )
      .unique();
  }

  return await ctx.runQuery(internal.system.subscriptions.getByOrganizationId, {
    organizationId: clerkOrganizationId,
  });
};

export const requireSubscriptionFeatureAccess = async (
  ctx: AuthenticatedOrganizationContext,
): Promise<{
  identity: ValidatedOrgUserIdentity;
  clerkOrganizationId: string;
  organizationId: Id<"organizations">;
  organization: Doc<"organizations">;
}> => {
  const { identity, clerkOrganizationId, organizationId, organization } =
    await getAuthenticatedOrganization(ctx);
  const subscription = await getSubscriptionByOrganizationId(
    ctx,
    clerkOrganizationId,
  );

  if (!hasSubscriptionFeatureAccess(subscription)) {
    throw new ConvexError({
      code: "SUBSCRIPTION_REQUIRED",
      message: "Pro subscription required",
    });
  }

  return {
    identity,
    clerkOrganizationId,
    organizationId,
    organization,
  };
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
  clerkOrgId: string,
  filename: string,
  contentHash?: string,
): Promise<void> => {
  const [pendingNameMatches, pendingHashMatches, pendingOrgMatches]: [
    Doc<"pendingDeletions">[],
    Doc<"pendingDeletions">[],
    Doc<"pendingDeletions">[],
  ] = await Promise.all([
    ctx.runQuery(internal.private.files.listPendingDeletionsByFilename, {
      clerkOrgId,
      filename,
    }),
    contentHash
      ? ctx.runQuery(internal.private.files.listPendingDeletionsByHash, {
          clerkOrgId,
          contentHash,
        })
      : Promise.resolve([] as Doc<"pendingDeletions">[]),
    contentHash
      ? ctx.runQuery(internal.private.files.listPendingDeletionsByOrg, {
          clerkOrgId,
          limit: 200,
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

    const hydratedHashMatches = await asyncMapBatch<
      Doc<"pendingDeletions">,
      Doc<"pendingDeletions"> | null
    >(pendingToHydrate, 10, async (pending) => {
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
    });

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
  const { clerkOrganizationId } = await requireSubscriptionFeatureAccess(ctx);

  const plugin = await ctx.runQuery(
    internal.system.plugins.getByOrgIdAndService,
    {
      organizationId: clerkOrganizationId,
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
