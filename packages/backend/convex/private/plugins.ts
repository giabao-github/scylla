import { ConvexError, v } from "convex/values";

import { mutation, query } from "@workspace/backend/_generated/server";
import {
  getAuthenticatedOrgId,
  getPluginByOrgAndService,
} from "@workspace/backend/private/utils";

export const getOne = query({
  args: {
    service: v.union(v.literal("vapi")),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthenticatedOrgId(ctx);
    return await getPluginByOrgAndService(ctx, organizationId, args.service);
  },
});

export const remove = mutation({
  args: {
    service: v.union(v.literal("vapi")),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthenticatedOrgId(ctx);

    const existingPlugin = await getPluginByOrgAndService(
      ctx,
      organizationId,
      args.service,
    );

    if (!existingPlugin) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Plugin not found" });
    }

    await ctx.db.delete(existingPlugin._id);
  },
});
