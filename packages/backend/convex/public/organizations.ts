import { createClerkClient } from "@clerk/backend";
import { v } from "convex/values";

import { internal } from "@workspace/backend/_generated/api";
import {
  action,
  internalMutation,
  query,
} from "@workspace/backend/_generated/server";

const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!clerkSecretKey) {
  throw new Error("CLERK_SECRET_KEY is required");
}

const clerkClient = createClerkClient({
  secretKey: clerkSecretKey,
});

export const validate = action({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const org = await clerkClient.organizations.getOrganization({
        organizationId: args.organizationId,
      });

      // Sync with Convex database
      const id = (await ctx.runMutation(internal.public.organizations.upsert, {
        organizationId: org.id,
        name: org.name,
      })) as string;

      return { valid: true, id } as const;
    } catch (error) {
      if (
        error instanceof Error &&
        "status" in error &&
        (error as any).status === 404
      ) {
        return { valid: false, reason: "Organization not found" } as const;
      }
      throw error;
    }
  },
});

export const upsert = internalMutation({
  args: {
    organizationId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .unique();

    if (existing) {
      if (existing.name !== args.name) {
        await ctx.db.patch(existing._id, { name: args.name });
      }
      return existing._id;
    }

    return await ctx.db.insert("organizations", {
      organizationId: args.organizationId,
      name: args.name,
    });
  },
});

export const getByClerkId = query({
  args: {
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.clerkOrgId),
      )
      .unique();
  },
});
