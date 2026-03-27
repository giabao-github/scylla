import { ConvexError, v } from "convex/values";

import {
  internalMutation,
  internalQuery,
} from "@workspace/backend/_generated/server";

import { getMessageRequest, requireMessageRequest } from "./utils";

const STALE_TIMEOUT = 30_000;
const MAX_REQUEST_IDS = 100;

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
    if (existing.status === "processing")
      return { skipped: true, deleted: false };

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

    const stale = [...completed, ...errored];

    await Promise.all(stale.map((r) => ctx.db.delete(r._id)));
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

    if (existing.status === "completed") {
      throw new ConvexError({
        code: "IMMUTABLE_STATE",
        message: "Completed request cannot be modified",
      });
    }

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
  handler: async (ctx, { requestId, contactSessionId }) => {
    const existing = await getMessageRequest(ctx, requestId);
    const now = Date.now();

    if (existing) {
      if (existing.status === "completed") {
        return {
          status: "already_done",
          userMessageId: existing.userMessageId,
        };
      }
      if (
        existing.status === "processing" &&
        now - existing.updatedAt < STALE_TIMEOUT
      ) {
        return { status: "in_progress", userMessageId: null };
      }

      await ctx.db.patch(existing._id, {
        status: "processing",
        updatedAt: now,
      });

      return {
        status: "retry",
        userMessageId: existing.userMessageId ?? null,
        aiResponseSaved: existing.aiResponseSaved ?? false,
      };
    }

    await ctx.db.insert("messageRequests", {
      requestId,
      contactSessionId,
      status: "processing",
      createdAt: now,
      updatedAt: now,
    });

    return { status: "new", userMessageId: null };
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
  },
  handler: async (ctx, { requestId, messageId }) => {
    const existing = await requireMessageRequest(ctx, requestId);

    if (existing.userMessageId) {
      if (existing.userMessageId !== messageId) {
        console.error(
          "[MessageRequest] invariant violated: conflicting userMessageId",
          {
            event: "MESSAGE_ID_CONFLICT",
            requestId,
            existingMessageId: existing.userMessageId,
            newMessageId: messageId,
          },
        );
      }
      return;
    }

    await ctx.db.patch(existing._id, {
      userMessageId: messageId,
      updatedAt: Date.now(),
    });
  },
});
