import { v } from "convex/values";

import { internal } from "@workspace/backend/_generated/api";
import { mutation } from "@workspace/backend/_generated/server";
import { getAuthenticatedOrgId } from "@workspace/backend/private/utils";

export const upsert = mutation({
  args: {
    service: v.literal("vapi"),
    value: v.object({
      publicApiKey: v.string(),
      privateApiKey: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthenticatedOrgId(ctx);

    // TODO: check for subscription

    await ctx.scheduler.runAfter(0, internal.system.secrets.upsert, {
      organizationId,
      service: args.service,
      value: args.value,
    });
  },
});
