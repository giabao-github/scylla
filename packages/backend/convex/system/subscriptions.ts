import { ConvexError, v } from "convex/values";

import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import {
  internalMutation,
  internalQuery,
} from "@workspace/backend/_generated/server";
import { getAuthenticatedIdentity } from "@workspace/backend/private/utils";

export const upsert = internalMutation({
  args: {
    organizationId: v.string(),
    status: v.union(
      v.literal("free"),
      v.literal("active"),
      v.literal("canceled"),
    ),
    periodEnd: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args): Promise<Id<"subscriptions">> => {
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_org_id", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .unique();

    if (existingSubscription) {
      await ctx.db.patch(existingSubscription._id, {
        status: args.status,
        periodEnd: args.periodEnd,
        updatedAt: Date.now(),
      });
      return existingSubscription._id;
    } else {
      return await ctx.db.insert("subscriptions", {
        organizationId: args.organizationId,
        status: args.status,
        periodEnd: args.periodEnd,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const getByOrganizationId = internalQuery({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"subscriptions"> | null> => {
    const { clerkOrganizationId } = await getAuthenticatedIdentity(ctx);

    if (clerkOrganizationId !== args.organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Unauthorized to view subscription data",
      });
    }

    return await ctx.db
      .query("subscriptions")
      .withIndex("by_org_id", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .unique();
  },
});
