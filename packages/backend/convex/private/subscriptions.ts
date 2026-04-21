import { v } from "convex/values";

import { internal } from "@workspace/backend/_generated/api";
import { Doc } from "@workspace/backend/_generated/dataModel";
import { query } from "@workspace/backend/_generated/server";

export const getByOrganizationId = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"subscriptions"> | null> => {
    return await ctx.runQuery(
      internal.system.subscriptions.getByOrganizationId,
      args,
    );
  },
});
