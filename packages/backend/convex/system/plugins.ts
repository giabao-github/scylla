import { ConvexError, v } from "convex/values";

import {
  internalMutation,
  internalQuery,
} from "@workspace/backend/_generated/server";

export const upsert = internalMutation({
  args: {
    organizationId: v.string(),
    service: v.union(v.literal("vapi")),
    secretName: v.string(),
  },
  handler: async (ctx, args) => {
    const existingPlugin = await ctx.db
      .query("plugins")
      .withIndex("by_org_id_and_service", (q) =>
        q.eq("organizationId", args.organizationId).eq("service", args.service),
      )
      .unique();

    if (existingPlugin) {
      await ctx.db.patch(existingPlugin._id, {
        secretName: args.secretName,
      });
    } else {
      await ctx.db.insert("plugins", {
        organizationId: args.organizationId,
        service: args.service,
        secretName: args.secretName,
      });
    }
  },
});
export const getByOrgIdAndService = internalQuery({
  args: {
    organizationId: v.string(),
    service: v.union(v.literal("vapi")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("plugins")
      .withIndex("by_org_id_and_service", (q) =>
        q.eq("organizationId", args.organizationId).eq("service", args.service),
      )
      .unique();
  },
});
