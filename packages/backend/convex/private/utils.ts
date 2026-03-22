import type { UserIdentity } from "convex/server";
import { ConvexError } from "convex/values";

interface OrgUserIdentity extends UserIdentity {
  orgId?: string;
}

interface ValidatedOrgUserIdentity extends UserIdentity {
  orgId: string;
}

export const getAuthenticatedOrgId = async (ctx: {
  auth: { getUserIdentity: () => Promise<OrgUserIdentity | null> };
}): Promise<{ identity: ValidatedOrgUserIdentity; organizationId: string }> => {
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
