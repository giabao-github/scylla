import { PaginationResult, paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { internal } from "@workspace/backend/_generated/api";
import { Doc } from "@workspace/backend/_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "@workspace/backend/_generated/server";
import {
  DELETION_BATCH_SIZE,
  MAX_BATCHES_PER_PARENT,
  MESSAGE_REQUEST_BATCH,
} from "@workspace/backend/constants";
import { getAuthenticatedOrganization } from "@workspace/backend/private/utils";
import { supportAgent } from "@workspace/backend/system/ai/agents/supportAgent";
import {
  CONVERSATION_STATUS,
  type ConversationStatus,
} from "@workspace/shared/types/conversation";

const statusValidator = v.union(
  v.literal(CONVERSATION_STATUS.UNRESOLVED),
  v.literal(CONVERSATION_STATUS.ESCALATED),
  v.literal(CONVERSATION_STATUS.RESOLVED),
);

const STALE_THREAD_DELETION_CLAIM_MS = 5 * 60 * 1000;

export const listPendingThreadDeletions = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<Doc<"pendingThreadDeletions">[]> => {
    const effectiveLimit = Math.max(
      1,
      Math.min(args.limit ?? DELETION_BATCH_SIZE, 1000),
    );
    const now = Date.now();
    const staleThreshold = now - STALE_THREAD_DELETION_CLAIM_MS;

    const result: Doc<"pendingThreadDeletions">[] = [];
    let cursor: string | null = null;
    const batchSize = effectiveLimit * 2;
    const maxScans = 5;
    let scans = 0;

    while (result.length < effectiveLimit && scans < maxScans) {
      const batch = await ctx.db
        .query("pendingThreadDeletions")
        .withIndex("by_scheduled_at", (q) => q.lte("scheduledAt", now))
        .paginate({ cursor, numItems: batchSize });

      for (const row of batch.page) {
        const isNotClaimed =
          row.claimedAt === undefined || row.claimedAt < staleThreshold;
        if (isNotClaimed) {
          result.push(row);
          if (result.length >= effectiveLimit) break;
        }
      }

      if (batch.isDone) break;
      cursor = batch.continueCursor;
      scans++;
    }

    if (scans >= maxScans && result.length < effectiveLimit) {
      console.warn(
        `listPendingThreadDeletions hit maxScans (${maxScans}). ` +
          `Returned ${result.length}/${effectiveLimit} requested.`,
      );
    }

    return result;
  },
});

export const markPendingThreadDeletion = internalMutation({
  args: {
    threadId: v.string(),
    organizationId: v.id("organizations"),
    conversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pendingThreadDeletions")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        organizationId: args.organizationId,
        conversationId: args.conversationId,
        scheduledAt: Date.now(),
        claimedAt: undefined,
      });
      return { queued: false };
    }

    await ctx.db.insert("pendingThreadDeletions", {
      threadId: args.threadId,
      organizationId: args.organizationId,
      conversationId: args.conversationId,
      scheduledAt: Date.now(),
    });

    return { queued: true };
  },
});

export const claimPendingThreadDeletion = internalMutation({
  args: { id: v.id("pendingThreadDeletions") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (!row) return { claimed: false };

    const now = Date.now();
    const isAlreadyClaimed =
      row.claimedAt !== undefined &&
      now - row.claimedAt < STALE_THREAD_DELETION_CLAIM_MS;

    if (isAlreadyClaimed) return { claimed: false };

    await ctx.db.patch(id, {
      claimedAt: now,
      scheduledAt: now + STALE_THREAD_DELETION_CLAIM_MS,
    });

    return { claimed: true };
  },
});

export const removePendingThreadDeletion = internalMutation({
  args: { id: v.id("pendingThreadDeletions") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const incrementPendingThreadDeletionRetryCount = internalMutation({
  args: { id: v.id("pendingThreadDeletions") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (!row) return;

    const nextRetryCount = (row.retryCount ?? 0) + 1;
    const backoffMs = Math.min(1000 * 2 ** nextRetryCount, 60 * 60 * 1000);
    const retryAfter = Date.now() + backoffMs;

    await ctx.db.patch(id, {
      retryCount: nextRetryCount,
      retryAfter,
      scheduledAt: retryAfter,
      claimedAt: undefined,
    });
  },
});

export const movePendingThreadDeletionToDeadLetterQueue = internalMutation({
  args: {
    id: v.id("pendingThreadDeletions"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const pending = await ctx.db.get(args.id);
    if (!pending) return;

    await ctx.db.insert("failedThreadDeletions", {
      threadId: pending.threadId,
      organizationId: pending.organizationId,
      conversationId: pending.conversationId,
      error: args.error,
      failedAt: Date.now(),
    });

    await ctx.db.delete(args.id);
  },
});

export const getOne = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthenticatedOrganization(ctx);
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (conversation.organizationId !== organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User is not authorized to access this conversation",
      });
    }

    const contactSession = await ctx.db.get(conversation.contactSessionId);

    if (!contactSession) {
      throw new ConvexError({
        code: "INTERNAL",
        message: "Data integrity violation: missing contact session",
      });
    }

    return {
      ...conversation,
      lastMessage: conversation.lastMessage ?? null,
      contactSession: {
        _id: contactSession._id,
        name: contactSession.name,
        blockedAt: contactSession.blockedAt ?? null,
        metadata: contactSession.metadata
          ? {
              countryCode: contactSession.metadata.countryCode ?? null,
              country: contactSession.metadata.country ?? null,
              timezone: contactSession.metadata.timezone ?? null,
            }
          : null,
      },
    };
  },
});

export const getMany = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthenticatedOrganization(ctx);
    let conversations: PaginationResult<Doc<"conversations">>;

    if (args.status) {
      conversations = await ctx.db
        .query("conversations")
        .withIndex("by_org_id_and_status_and_last_message_at", (q) =>
          q
            .eq("organizationId", organizationId)
            .eq("status", args.status as ConversationStatus),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      conversations = await ctx.db
        .query("conversations")
        .withIndex("by_org_id_and_last_message_at", (q) =>
          q.eq("organizationId", organizationId),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    const results = await Promise.allSettled(
      conversations.page.map(async (conversation) => {
        const contactSession = await ctx.db.get(conversation.contactSessionId);

        if (!contactSession) {
          throw new ConvexError({
            code: "INTERNAL",
            message: "Data integrity violation: missing contact session",
          });
        }

        return {
          ...conversation,
          lastMessage: conversation.lastMessage ?? null,
          contactSession: {
            _id: contactSession._id,
            name: contactSession.name,
            metadata: contactSession.metadata
              ? {
                  countryCode: contactSession.metadata.countryCode ?? null,
                  country: contactSession.metadata.country ?? null,
                  timezone: contactSession.metadata.timezone ?? null,
                }
              : null,
          },
        };
      }),
    );

    const conversationWithAdditionalData = results.map((result, idx) => {
      if (result.status === "fulfilled") return result.value;
      const error = result.reason;
      const conversation = conversations.page[idx];
      if (!conversation) {
        console.error(`Unexpected: no conversation at index ${idx}`);
        return null;
      }
      const isIntegrityError =
        error instanceof ConvexError && error.data?.code === "INTERNAL";
      console.warn(
        `${isIntegrityError ? "Data integrity issue" : "Unexpected error"} processing conversation [${conversation._id}]:`,
        error instanceof Error ? error.message : error,
      );
      return null;
    });

    const validConversations = conversationWithAdditionalData.filter(
      (c): c is NonNullable<typeof c> => c !== null,
    );

    const skippedCount =
      conversationWithAdditionalData.length - validConversations.length;

    if (skippedCount > 0) {
      console.warn(
        `Skipped ${skippedCount} conversations in getMany for organization [${organizationId}]`,
      );
    }

    return {
      ...conversations,
      skippedCount,
      page: validConversations,
    };
  },
});

export const updateStatus = mutation({
  args: {
    conversationId: v.id("conversations"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthenticatedOrganization(ctx);

    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (conversation.organizationId !== organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User is not authorized to access this conversation",
      });
    }

    if (conversation.status === args.status) {
      return;
    }

    const validTransitions: Record<ConversationStatus, ConversationStatus[]> = {
      [CONVERSATION_STATUS.UNRESOLVED]: [
        CONVERSATION_STATUS.ESCALATED,
        CONVERSATION_STATUS.RESOLVED,
      ],
      [CONVERSATION_STATUS.ESCALATED]: [CONVERSATION_STATUS.RESOLVED],
      [CONVERSATION_STATUS.RESOLVED]: [CONVERSATION_STATUS.UNRESOLVED],
    };

    if (!validTransitions[conversation.status].includes(args.status)) {
      throw new ConvexError({
        code: "INVALID_STATUS_TRANSITION",
        message: "Invalid conversation status transition",
        context: { from: conversation.status, to: args.status },
      });
    }

    await ctx.db.patch(args.conversationId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const markSeen = mutation({
  args: {
    conversationId: v.id("conversations"),
    seenAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthenticatedOrganization(ctx);

    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (conversation.organizationId !== organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User is not authorized to access this conversation",
      });
    }

    const maxSeenAt = Date.now();

    if (args.seenAt < conversation.createdAt || args.seenAt > maxSeenAt) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Invalid seen timestamp",
      });
    }

    if (
      conversation.lastSeenByAgentAt &&
      conversation.lastSeenByAgentAt >= args.seenAt
    ) {
      return;
    }

    await ctx.db.patch(args.conversationId, {
      lastSeenByAgentAt: args.seenAt,
    });
  },
});

export const deleteOne = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthenticatedOrganization(ctx);

    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (conversation.organizationId !== organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User is not authorized to delete this conversation",
      });
    }

    const contactSession = await ctx.db.get(conversation.contactSessionId);
    if (!contactSession) {
      console.warn(
        `[deleteOne] Missing contact session for conversation [${args.conversationId}]`,
      );
    }
    if (contactSession?.blockedAt) {
      throw new ConvexError({
        code: "BLOCKED_CONTACT",
        message:
          "Cannot delete a conversation with a blocked user. Unblock them first.",
      });
    }

    // Purge associated message requests in capped batches
    let hasMore = true;
    let batches = 0;

    while (hasMore && batches < MAX_BATCHES_PER_PARENT) {
      const requests = await ctx.db
        .query("messageRequests")
        .withIndex("by_conversation_id", (q) =>
          q.eq("conversationId", args.conversationId),
        )
        .order("asc")
        .take(MESSAGE_REQUEST_BATCH);

      hasMore = requests.length === MESSAGE_REQUEST_BATCH;

      for (const request of requests) {
        await ctx.db.delete(request._id);
      }

      batches += 1;
    }

    if (hasMore) {
      throw new ConvexError({
        code: "PURGE_LIMIT_EXCEEDED",
        message:
          "Too many message requests to delete in one go. Please try again.",
      });
    }

    const { threadId } = conversation;
    await ctx.db.delete(args.conversationId);

    // Schedule async thread deletion (messages are stored in the agent component)
    try {
      await supportAgent.deleteThreadAsync(ctx, { threadId });
    } catch (err) {
      console.error(
        `[deleteOne] Failed to schedule thread deletion for thread [${threadId}]:`,
        err instanceof Error ? err.message : err,
      );
      try {
        await ctx.runMutation(
          internal.private.conversations.markPendingThreadDeletion,
          {
            threadId,
            organizationId,
            conversationId: args.conversationId,
          },
        );
        await ctx.scheduler.runAfter(
          0,
          internal.pendingThreadDeletions.processPendingThreadDeletions,
          {},
        );
      } catch (fallbackErr) {
        console.error(
          `[deleteOne] Fallback failed for thread [${threadId}]. Manual cleanup required.`,
          fallbackErr instanceof Error ? fallbackErr.message : fallbackErr,
        );
      }
    }
  },
});
