import { ConvexError, v } from "convex/values";

import { internal } from "@workspace/backend/_generated/api";
import { action } from "@workspace/backend/_generated/server";
import { getAuthenticatedOrgId } from "@workspace/backend/private/utils";

export const upsert = action({
  args: {
    service: v.literal("vapi"),
    value: v.object({
      publicApiKey: v.string(),
      privateApiKey: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthenticatedOrgId(ctx);

    if (!args.value.publicApiKey.trim() || !args.value.privateApiKey.trim()) {
      throw new ConvexError({
        code: "INVALID_API_KEYS",
        message: "API keys cannot be empty",
      });
    }

    // TODO: check for subscription

    await ctx.runAction(internal.system.secrets.upsert, {
      organizationId,
      service: args.service,
      value: args.value,
    });
  },
});
