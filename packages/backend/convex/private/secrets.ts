import { ConvexError, v } from "convex/values";

import { internal } from "@workspace/backend/_generated/api";
import { action } from "@workspace/backend/_generated/server";
import { requireSubscriptionFeatureAccess } from "@workspace/backend/private/utils";

export const upsert = action({
  args: {
    service: v.literal("vapi"),
    value: v.object({
      publicApiKey: v.string(),
      privateApiKey: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireSubscriptionFeatureAccess(ctx);

    const trimmedValue = {
      publicApiKey: args.value.publicApiKey.trim(),
      privateApiKey: args.value.privateApiKey.trim(),
    };

    if (!trimmedValue.publicApiKey || !trimmedValue.privateApiKey) {
      throw new ConvexError({
        code: "INVALID_API_KEYS",
        message: "API keys cannot be empty",
      });
    }

    await ctx.runAction(internal.system.secrets.upsert, {
      organizationId,
      service: args.service,
      value: trimmedValue,
    });
  },
});
