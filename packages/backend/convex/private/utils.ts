import { EntryId } from "@convex-dev/rag";
import type { UserIdentity } from "convex/server";
import { ConvexError } from "convex/values";

import { internal } from "@workspace/backend/_generated/api";
import { Doc } from "@workspace/backend/_generated/dataModel";
import {
  ActionCtx,
  type DatabaseReader,
  MutationCtx,
} from "@workspace/backend/_generated/server";
import rag from "@workspace/backend/system/ai/rag";

import { isNotFoundError } from "@workspace/shared/lib/file-utils";

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
    .withIndex("by_organization_id", (q) => q.eq("organizationId", clerkOrgId))
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
  const [pendingNameMatches, pendingHashMatches] = await Promise.all([
    ctx.runQuery(internal.private.files.listPendingDeletionsByFilename, {
      organizationId,
      filename,
    }),
    contentHash
      ? ctx.runQuery(internal.private.files.listPendingDeletionsByHash, {
          organizationId,
          contentHash,
        })
      : Promise.resolve([]),
  ]);

  const seenEntryIds = new Set<string>();
  const uniquePending = [...pendingNameMatches, ...pendingHashMatches].filter(
    (p) => {
      if (seenEntryIds.has(p.entryId)) return false;
      seenEntryIds.add(p.entryId);
      return true;
    },
  );

  await Promise.all(
    uniquePending.map(async (pending) => {
      try {
        await rag.deleteAsync(ctx, { entryId: pending.entryId as EntryId });

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
    }),
  );
};
