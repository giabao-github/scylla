import { ConvexError } from "convex/values";

import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { MutationCtx, QueryCtx } from "@workspace/backend/_generated/server";

export const validateSession = async (
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"contactSessions">,
  requiredOrganizationId?: string,
): Promise<Doc<"contactSessions">> => {
  const session = await ctx.db.get(sessionId);

  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired session",
    });
  }

  if (
    requiredOrganizationId &&
    session.organizationId !== requiredOrganizationId
  ) {
    throw new ConvexError({ code: "UNAUTHORIZED", message: "Invalid session" });
  }

  return session;
};
