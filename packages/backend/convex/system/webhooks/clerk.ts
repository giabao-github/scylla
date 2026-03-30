import { v } from "convex/values";

import { internal } from "@workspace/backend/_generated/api";
import {
  internalAction,
  internalMutation,
} from "@workspace/backend/_generated/server";

export const removeOrganization = internalAction({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await ctx.runMutation(
      internal.system.webhooks.clerk.markForDeletion,
      {
        clerkOrgId: args.organizationId,
      },
    );

    if (!orgId) {
      console.warn(
        `[removeOrganization] No organization found to delete for ID: ${args.organizationId}`,
      );
      return;
    }

    console.info(`[removeOrganization] Starting batched purge for: ${orgId}`);

    let conversationCursor: string | null = null;
    let purgedConversationCount = 0;

    try {
      do {
        const result = (await ctx.runMutation(
          internal.system.webhooks.clerk.deleteConversationBatch,
          {
            orgId,
            cursor: conversationCursor,
          },
        )) as { cursor: string | null; count: number };

        conversationCursor = result.cursor;
        purgedConversationCount += result.count;
        console.info(
          `[removeOrganization] Purged ${purgedConversationCount} conversations so far...`,
        );
      } while (conversationCursor !== null);
    } catch (error) {
      console.error(
        `[removeOrganization] Conversation purge failed for org [${orgId}] ` +
          `after ${purgedConversationCount} conversations. ` +
          `Will be retried by scheduled cleanup job.`,
        error,
      );
      // Don't rethrow — let the org stay in "deleting" so the cron picks it up
      return;
    }

    let sessionCursor: string | null = null;
    let purgedSessionCount = 0;

    try {
      do {
        const result = (await ctx.runMutation(
          internal.system.webhooks.clerk.deleteSessionBatch,
          {
            orgId,
            cursor: sessionCursor,
          },
        )) as { cursor: string | null; count: number };

        sessionCursor = result.cursor;
        purgedSessionCount += result.count;
        console.info(
          `[removeOrganization] Purged ${purgedSessionCount} sessions so far...`,
        );
      } while (sessionCursor !== null);
    } catch (error) {
      console.error(
        `[removeOrganization] Session purge failed for org [${orgId}] ` +
          `after ${purgedSessionCount} sessions. ` +
          `Will be retried by scheduled cleanup job.`,
        error,
      );
      return;
    }

    try {
      await ctx.runMutation(internal.system.webhooks.clerk.finalizeDeletion, {
        orgId,
      });
    } catch (error) {
      console.error(
        `[removeOrganization] Finalization failed for org [${orgId}]. ` +
          `Will be retried by scheduled cleanup job.`,
        error,
      );
      return;
    }

    console.info(
      `[removeOrganization] Purge complete for organization [${orgId}]. Total: ${purgedConversationCount} conversations, ${purgedSessionCount} sessions.`,
    );
  },
});

export const markForDeletion = internalMutation({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.clerkOrgId),
      )
      .unique();

    if (!org) return null;

    await ctx.db.patch(org._id, {
      deletionStatus: "deleting",
      deletionStartedAt: Date.now(),
    });
    return org._id;
  },
});

export const deleteConversationBatch = internalMutation({
  args: {
    orgId: v.id("organizations"),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { orgId, cursor }) => {
    const page = await ctx.db
      .query("conversations")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .paginate({ cursor, numItems: 25 });

    for (const conversation of page.page) {
      const requests = await ctx.db
        .query("messageRequests")
        .withIndex("by_conversation_id", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .collect();

      for (const req of requests) {
        await ctx.db.delete(req._id);
      }

      await ctx.db.delete(conversation._id);
    }

    return {
      cursor: page.isDone ? null : page.continueCursor,
      count: page.page.length,
    };
  },
});

export const deleteSessionBatch = internalMutation({
  args: {
    orgId: v.id("organizations"),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { orgId, cursor }) => {
    const page = await ctx.db
      .query("contactSessions")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .paginate({ cursor, numItems: 100 });

    for (const session of page.page) {
      await ctx.db.delete(session._id);
    }

    return {
      cursor: page.isDone ? null : page.continueCursor,
      count: page.page.length,
    };
  },
});

export const finalizeDeletion = internalMutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (org) {
      await ctx.db.delete(org._id);
    }
  },
});
