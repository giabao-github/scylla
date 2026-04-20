import { v } from "convex/values";

import { Doc } from "@workspace/backend/_generated/dataModel";
import { query } from "@workspace/backend/_generated/server";

export const getByOrganizationId = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"subscriptions"> | null> => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_org_id", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .unique();
  },
});
