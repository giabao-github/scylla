import { Doc } from "@workspace/backend/_generated/dataModel";
import { query } from "@workspace/backend/_generated/server";
import { getAuthenticatedOrganization } from "@workspace/backend/convex/private/utils";

export const getByOrganizationId = query({
  args: {},
  handler: async (ctx): Promise<Doc<"subscriptions"> | null> => {
    const { clerkOrganizationId } = await getAuthenticatedOrganization(ctx);

    return await ctx.db
      .query("subscriptions")
      .withIndex("by_org_id", (q) =>
        q.eq("organizationId", clerkOrganizationId),
      )
      .unique();
  },
});
