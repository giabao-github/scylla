import { v } from "convex/values";

import {
  internalMutation,
  internalQuery,
} from "@workspace/backend/_generated/server";

export const upsert = internalMutation({
  args: {
    clerkOrgId: v.string(),
    service: v.union(v.literal("vapi")),
    secretName: v.string(),
  },
  handler: async (ctx, args) => {
    const existingPlugin = await ctx.db
      .query("plugins")
      .withIndex("by_org_id_and_service", (q) =>
        q.eq("organizationId", args.clerkOrgId).eq("service", args.service),
      )
      .unique();

    if (existingPlugin) {
      await ctx.db.patch(existingPlugin._id, {
        secretName: args.secretName,
        lastConnectedAt: Date.now(),
      });
      return existingPlugin._id;
    } else {
      return await ctx.db.insert("plugins", {
        organizationId: args.clerkOrgId,
        service: args.service,
        secretName: args.secretName,
        lastConnectedAt: Date.now(),
      });
    }
  },
});

export const getByOrgIdAndService = internalQuery({
  args: {
    clerkOrgId: v.string(),
    service: v.union(v.literal("vapi")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("plugins")
      .withIndex("by_org_id_and_service", (q) =>
        q.eq("organizationId", args.clerkOrgId).eq("service", args.service),
      )
      .unique();
  },
});
