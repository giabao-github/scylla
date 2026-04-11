import { ConvexError, v } from "convex/values";

import { internal } from "@workspace/backend/_generated/api";
import {
  internalQuery,
  mutation,
  query,
} from "@workspace/backend/_generated/server";
import {
  getAuthenticatedOrgId,
  getPluginByOrgAndService,
} from "@workspace/backend/private/utils";

export const getOne = query({
  args: {
    service: v.literal("vapi"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthenticatedOrgId(ctx);
    const plugin = await getPluginByOrgAndService(
      ctx,
      organizationId,
      args.service,
    );
    return plugin ? { service: plugin.service } : null;
  },
});

export const remove = mutation({
  args: {
    service: v.literal("vapi"),
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

    await ctx.scheduler.runAfter(0, internal.system.secrets.deleteSecret, {
      organizationId,
      service: args.service,
      secretName: existingPlugin.secretName,
      connectedAt: existingPlugin.lastConnectedAt,
    });
  },
});

export const getPluginByOrgAndServiceQuery = internalQuery({
  args: {
    organizationId: v.string(),
    service: v.literal("vapi"),
  },
  handler: async (ctx, { organizationId, service }) => {
    return getPluginByOrgAndService(ctx, organizationId, service);
  },
});
