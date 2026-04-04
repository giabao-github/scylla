import type { UserIdentity } from "convex/server";
import { ConvexError } from "convex/values";

import { Doc } from "@workspace/backend/_generated/dataModel";
import {
  type DatabaseReader,
  MutationCtx,
} from "@workspace/backend/_generated/server";

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
