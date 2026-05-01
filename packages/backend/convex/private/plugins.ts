import { ConvexError, v } from "convex/values";

import { internal } from "@workspace/backend/_generated/api";
import {
  internalQuery,
  mutation,
  query,
} from "@workspace/backend/_generated/server";
import {
  getAuthenticatedOrganization,
  getPluginByOrgAndService,
  requireSubscriptionFeatureAccess,
} from "@workspace/backend/private/utils";

export const getOne = query({
  args: {
    service: v.literal("vapi"),
  },
  handler: async (ctx, args) => {
    const { clerkOrganizationId } = await getAuthenticatedOrganization(ctx);
    const plugin = await getPluginByOrgAndService(
      ctx,
      clerkOrganizationId,
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
    const { clerkOrganizationId } = await requireSubscriptionFeatureAccess(ctx);

    const existingPlugin = await getPluginByOrgAndService(
      ctx,
      clerkOrganizationId,
      args.service,
    );

    if (!existingPlugin) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Plugin not found" });
    }

    await ctx.db.delete(existingPlugin._id);

    await ctx.scheduler.runAfter(0, internal.system.secrets.deleteSecret, {
      clerkOrgId: clerkOrganizationId,
      service: args.service,
      secretName: existingPlugin.secretName,
      connectedAt: existingPlugin.lastConnectedAt,
    });
  },
});

export const getPluginByOrgAndServiceQuery = internalQuery({
  args: {
    clerkOrgId: v.string(),
    service: v.literal("vapi"),
  },
  handler: async (ctx, { clerkOrgId, service }) => {
    return getPluginByOrgAndService(ctx, clerkOrgId, service);
  },
});
