import { v } from "convex/values";

import { internal } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import {
  MutationCtx,
  internalAction,
  internalMutation,
} from "@workspace/backend/_generated/server";

type RemoveOrganizationResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "not_found"
        | "conversation_purge_failed"
        | "session_purge_failed"
        | "finalization_incomplete"
        | "finalization_failed";
    };

const MESSAGE_REQUEST_BATCH = 500;
const MAX_BATCHES_PER_PARENT = 20;

const purgeMessageRequests = async (
  ctx: MutationCtx,
  fetchBatch: () => Promise<{ _id: Id<"messageRequests"> }[]>,
): Promise<{ done: boolean }> => {
  let hasMore = true;
  let batches = 0;

  while (hasMore && batches < MAX_BATCHES_PER_PARENT) {
    const requests = await fetchBatch();
    hasMore = requests.length === MESSAGE_REQUEST_BATCH;
    for (const req of requests) {
      await ctx.db.delete(req._id);
    }
    batches += 1;
  }

  return { done: !hasMore };
};

export const removeOrganization = internalAction({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args): Promise<RemoveOrganizationResult> => {
    const orgId = await ctx.runMutation(
      internal.system.webhooks.clerk.markForDeletion,
      { clerkOrgId: args.organizationId },
    );

    if (!orgId) {
      console.warn(
        `[removeOrganization] No organization found to delete for ID: ${args.organizationId}`,
      );
      return { ok: false, reason: "not_found" } as const;
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
        `[removeOrganization] Conversation purge failed for organization [${orgId}] ` +
          `after ${purgedConversationCount} conversations. ` +
          `Will be retried by scheduled cleanup job.`,
        error,
      );
      return { ok: false, reason: "conversation_purge_failed" } as const;
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
        `[removeOrganization] Session purge failed for organization [${orgId}] ` +
          `after ${purgedSessionCount} sessions. ` +
          `Will be retried by scheduled cleanup job.`,
        error,
      );
      return { ok: false, reason: "session_purge_failed" } as const;
    }

    try {
      const deleted = await ctx.runMutation(
        internal.system.webhooks.clerk.finalizeDeletion,
        { orgId },
      );
      if (!deleted) {
        console.warn(
          `[removeOrganization] Finalization incomplete for organization [${orgId}]. Will be retried by scheduled cleanup job.`,
        );
        return { ok: false, reason: "finalization_incomplete" } as const;
      }
    } catch (error) {
      console.error(
        `[removeOrganization] Finalization failed for organization [${orgId}]. ` +
          `Will be retried by scheduled cleanup job.`,
        error,
      );
      return { ok: false, reason: "finalization_failed" } as const;
    }

    console.info(
      `[removeOrganization] Purge complete for organization [${orgId}]. Total: ${purgedConversationCount} conversations, ${purgedSessionCount} sessions.`,
    );
    return { ok: true } as const;
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
      const { done } = await purgeMessageRequests(ctx, () =>
        ctx.db
          .query("messageRequests")
          .withIndex("by_conversation_id", (q) =>
            q.eq("conversationId", conversation._id),
          )
          .order("asc")
          .take(MESSAGE_REQUEST_BATCH),
      );

      if (!done) {
        console.warn(
          `[deleteConversationBatch] Message request cap hit for conversation [${conversation._id}], deferring.`,
        );
        continue;
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
      const { done } = await purgeMessageRequests(ctx, () =>
        ctx.db
          .query("messageRequests")
          .withIndex("by_contact_session_id", (q) =>
            q.eq("contactSessionId", session._id),
          )
          .order("asc")
          .take(MESSAGE_REQUEST_BATCH),
      );

      if (!done) {
        console.warn(
          `[deleteSessionBatch] Message request cap hit for session [${session._id}], deferring.`,
        );
        continue;
      }

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
    const [sessions, conversations] = await Promise.all([
      ctx.db
        .query("contactSessions")
        .withIndex("by_organization_id", (q) =>
          q.eq("organizationId", args.orgId),
        )
        .first(),
      ctx.db
        .query("conversations")
        .withIndex("by_organization_id", (q) =>
          q.eq("organizationId", args.orgId),
        )
        .first(),
    ]);

    if (sessions || conversations) {
      console.error(
        `[finalizeDeletion] Dependents remain for organization [${args.orgId}] — aborting. Will retry.`,
      );
      return false;
    }

    const org = await ctx.db.get(args.orgId);
    if (!org) {
      console.info(
        `[finalizeDeletion] Organization [${args.orgId}] already deleted — treating as success.`,
      );
      return true;
    }

    await ctx.db.delete(org._id);
    return true;
  },
});
