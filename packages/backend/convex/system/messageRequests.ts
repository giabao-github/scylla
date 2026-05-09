import { ConvexError, v } from "convex/values";

import {
  internalMutation,
  internalQuery,
} from "@workspace/backend/_generated/server";
import {
  MAX_REQUEST_IDS,
  STALE_TIMEOUT_MS,
} from "@workspace/backend/constants";
import {
  getMessageRequest,
  requireMessageRequest,
} from "@workspace/backend/system/utils";

type ClaimResult =
  | { status: "already_done"; userMessageId: string | null }
  | { status: "in_progress" }
  | { status: "conversation_busy" }
  | { status: "new" }
  | {
      status: "retry";
      userMessageId: string | null;
      aiResponseSaved: boolean;
      lastMessageSynced: boolean;
      userMessageAt: number;
    };

export const claim = internalMutation({
  args: {
    requestId: v.string(),
    contactSessionId: v.optional(v.id("contactSessions")),
    conversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, { requestId, contactSessionId, conversationId }) => {
    const existing = await getMessageRequest(ctx, requestId);
    if (existing) return { duplicate: true };

    const now = Date.now();
    await ctx.db.insert("messageRequests", {
      requestId,
      contactSessionId,
      conversationId,
      status: "processing",
      createdAt: now,
      updatedAt: now,
    });

    return { duplicate: false };
  },
});

export const removeStaleRequest = internalMutation({
  args: { requestId: v.string() },
  handler: async (ctx, { requestId }) => {
    const existing = await getMessageRequest(ctx, requestId);

    if (!existing) return { skipped: false, deleted: false };

    await ctx.db.delete(existing._id);
    return { skipped: false, deleted: true };
  },
});

export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    const [completed, errored] = await Promise.all([
      ctx.db
        .query("messageRequests")
        .withIndex("by_status_and_updated_at", (q) =>
          q.eq("status", "completed").lt("updatedAt", cutoff),
        )
        .take(100),

      ctx.db
        .query("messageRequests")
        .withIndex("by_status_and_updated_at", (q) =>
          q.eq("status", "error").lt("updatedAt", cutoff),
        )
        .take(100),
    ]);

    const stuck = await ctx.db
      .query("messageRequests")
      .withIndex("by_status_and_updated_at", (q) =>
        q.eq("status", "processing").lt("updatedAt", cutoff),
      )
      .take(100);

    const stale = [...completed, ...errored, ...stuck];
    await Promise.all(stale.map((r) => ctx.db.delete(r._id)));

    return { deleted: stale.length, hasMore: stale.length === 300 };
  },
});

export const updateStatus = internalMutation({
  args: {
    requestId: v.string(),
    status: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("error"),
    ),
  },
  handler: async (ctx, { requestId, status }) => {
    const existing = await requireMessageRequest(ctx, requestId);

    if (existing.status === status) {
      return;
    }

    const validTransitions: Record<
      "processing" | "completed" | "error",
      readonly ("processing" | "completed" | "error")[]
    > = {
      processing: ["completed", "error"],
      error: ["processing"],
      completed: [],
    };

    if (!validTransitions[existing.status].includes(status)) {
      throw new ConvexError({
        code: "INVALID_STATUS_TRANSITION",
        message: "Invalid message request status transition",
        context: { from: existing.status, to: status },
      });
    }

    await ctx.db.patch(existing._id, {
      status,
      updatedAt: Date.now(),
    });
  },
});

export const claimAndSaveUserMessage = internalMutation({
  args: {
    requestId: v.string(),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (
    ctx,
    { requestId, contactSessionId },
  ): Promise<ClaimResult> => {
    const contactSession = await ctx.db.get(contactSessionId);
    if (!contactSession) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Contact session not found",
      });
    }

    if (contactSession.blockedAt) {
      throw new ConvexError({
        code: "BLOCKED",
        message: "You have been blocked from this organization",
      });
    }

    const existing = await getMessageRequest(ctx, requestId);
    const now = Date.now();

    if (existing) {
      if (existing.status === "completed") {
        return {
          status: "already_done",
          userMessageId: existing.userMessageId ?? null,
        };
      }
      if (
        existing.status === "processing" &&
        typeof existing.updatedAt === "number" &&
        Number.isFinite(existing.updatedAt) &&
        now - existing.updatedAt < STALE_TIMEOUT_MS
      ) {
        return { status: "in_progress" };
      }

      await ctx.db.patch(existing._id, {
        status: "processing",
        updatedAt: now,
      });

      return {
        status: "retry",
        userMessageId: existing.userMessageId ?? null,
        aiResponseSaved: existing.aiResponseSaved ?? false,
        lastMessageSynced: existing.lastMessageSynced ?? false,
        userMessageAt: existing.userMessageAt ?? existing.createdAt,
      };
    }

    const inFlightRequest = await ctx.db
      .query("messageRequests")
      .withIndex("by_contact_session_id", (q) =>
        q.eq("contactSessionId", contactSessionId),
      )
      .filter((q) =>
        q.and(
          q.neq(q.field("requestId"), requestId),
          q.eq(q.field("status"), "processing"),
          q.gte(q.field("updatedAt"), now - STALE_TIMEOUT_MS),
        ),
      )
      .first();

    if (inFlightRequest) {
      return { status: "conversation_busy" };
    }

    await ctx.db.insert("messageRequests", {
      requestId,
      contactSessionId,
      status: "processing",
      createdAt: now,
      updatedAt: now,
    });

    return { status: "new" };
  },
});

export const markAiResponseSaved = internalMutation({
  args: { requestId: v.string() },
  handler: async (ctx, { requestId }) => {
    const existing = await requireMessageRequest(ctx, requestId);
    if (existing.aiResponseSaved) return;
    await ctx.db.patch(existing._id, {
      aiResponseSaved: true,
      updatedAt: Date.now(),
    });
  },
});

export const markLastMessageSynced = internalMutation({
  args: { requestId: v.string() },
  handler: async (ctx, { requestId }) => {
    const existing = await requireMessageRequest(ctx, requestId);
    if (existing.lastMessageSynced) return;
    await ctx.db.patch(existing._id, {
      lastMessageSynced: true,
      updatedAt: Date.now(),
    });
  },
});

export const getMessageIds = internalQuery({
  args: {
    requestIds: v.array(v.string()),
  },
  handler: async (ctx, { requestIds }) => {
    if (requestIds.length > MAX_REQUEST_IDS) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Too many request IDs (maximum: ${MAX_REQUEST_IDS})`,
      });
    }

    const results = await Promise.all(
      requestIds.map((requestId) => getMessageRequest(ctx, requestId)),
    );

    const requestToMessageId: Record<string, string> = {};

    for (const result of results) {
      if (result?.userMessageId) {
        requestToMessageId[result.requestId] = result.userMessageId;
      }
    }

    return requestToMessageId;
  },
});

export const setUserMessageId = internalMutation({
  args: {
    requestId: v.string(),
    messageId: v.string(),
    messageAt: v.number(),
  },
  handler: async (ctx, { requestId, messageId, messageAt }) => {
    const existing = await requireMessageRequest(ctx, requestId);

    if (existing.userMessageId) {
      if (existing.userMessageId !== messageId) {
        throw new ConvexError({
          code: "INVARIANT_VIOLATION",
          message: "Conflicting userMessageId for request",
          context: {
            requestId,
            existingMessageId: existing.userMessageId,
            newMessageId: messageId,
          },
        });
      }
      return;
    }

    await ctx.db.patch(existing._id, {
      userMessageId: messageId,
      userMessageAt: messageAt,
      updatedAt: Date.now(),
    });
  },
});
