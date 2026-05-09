import { saveMessage } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { components, internal } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { mutation, query } from "@workspace/backend/_generated/server";
import { validateSession } from "@workspace/backend/public/utils";
import { supportAgent } from "@workspace/backend/system/ai/agents/supportAgent";
import { hasSubscriptionFeatureAccess } from "@workspace/shared/lib/subscription";
import { CONVERSATION_STATUS } from "@workspace/shared/types/conversation";

export const create = mutation({
  args: {
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args): Promise<Id<"conversations">> => {
    const session = await validateSession(ctx, args.contactSessionId);

    if (session.blockedAt) {
      throw new ConvexError({
        code: "BLOCKED",
        message: "You have been blocked from this organization",
      });
    }

    const organizationId = session.organizationId;
    const organization = await ctx.db.get(organizationId);

    if (!organization || organization.deletionStatus === "deleting") {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    await ctx.runMutation(internal.system.contactSessions.refresh, {
      contactSessionId: args.contactSessionId,
    });

    const subscription = await ctx.runQuery(
      internal.system.subscriptions.getByOrganizationId,
      {
        organizationId: organization.organizationId,
      },
    );

    const hasSubscription = hasSubscriptionFeatureAccess(subscription);

    const widgetSettings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_org_id", (q) =>
        q.eq("organizationId", organization.organizationId),
      )
      .unique();

    const { threadId } = await supportAgent.createThread(ctx, {
      userId: organizationId,
    });

    const initialMessage =
      widgetSettings?.greetingMessage ?? "Hello, how can I help you today?";

    const now = Date.now();

    try {
      const { message } = await saveMessage(ctx, components.agent, {
        threadId,
        message: {
          role: "assistant",
          content: initialMessage,
        },
      });

      const conversationId = await ctx.db.insert("conversations", {
        contactSessionId: session._id,
        status: hasSubscription
          ? CONVERSATION_STATUS.UNRESOLVED
          : CONVERSATION_STATUS.ESCALATED,
        organizationId: session.organizationId,
        threadId,
        createdAt: now,
        lastMessage: {
          text: initialMessage,
          role: "assistant",
        },
        lastMessageAt: message._creationTime,
      });

      return conversationId;
    } catch (err) {
      try {
        await supportAgent.deleteThreadAsync(ctx, { threadId });
      } catch (cleanupErr) {
        console.error(
          `Failed to clean up orphaned thread [${threadId}]:`,
          cleanupErr instanceof Error ? cleanupErr.message : cleanupErr,
        );
        try {
          await ctx.runMutation(
            internal.private.conversations.markPendingThreadDeletion,
            {
              threadId,
              organizationId: session.organizationId,
            },
          );
          await ctx.scheduler.runAfter(
            0,
            internal.pendingThreadDeletions.processPendingThreadDeletions,
            {},
          );
        } catch (markErr) {
          console.error(
            `Failed to schedule pending thread deletion for [${threadId}]:`,
            markErr instanceof Error ? markErr.message : markErr,
          );
        }
      }
      throw err;
    }
  },
});

export const getOne = query({
  args: {
    conversationId: v.id("conversations"),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.contactSessionId);

    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      return null;
    }

    if (
      conversation.contactSessionId !== session._id ||
      conversation.organizationId !== session.organizationId
    ) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }

    return {
      _id: conversation._id,
      status: conversation.status,
      threadId: conversation.threadId,
      createdAt: conversation.createdAt,
      lastSeenByAgentAt: conversation.lastSeenByAgentAt ?? null,
      lastSeenByContactAt: conversation.lastSeenByContactAt ?? null,
      blockedAt: session.blockedAt ?? null,
    };
  },
});

export const markSeenByContact = mutation({
  args: {
    conversationId: v.id("conversations"),
    contactSessionId: v.id("contactSessions"),
    seenAt: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.contactSessionId);
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (
      conversation.contactSessionId !== session._id ||
      conversation.organizationId !== session.organizationId
    ) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }

    if (args.seenAt < conversation.createdAt) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Invalid seen timestamp",
      });
    }

    const clampedSeenAt = Math.min(args.seenAt, Date.now());

    if (
      conversation.lastSeenByContactAt &&
      conversation.lastSeenByContactAt >= clampedSeenAt
    ) {
      return;
    }

    await ctx.db.patch(args.conversationId, {
      lastSeenByContactAt: clampedSeenAt,
    });
  },
});

export const getMany = query({
  args: {
    contactSessionId: v.id("contactSessions"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const contactSession = await validateSession(ctx, args.contactSessionId);

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_contact_session_id_and_last_message_at", (q) =>
        q.eq("contactSessionId", args.contactSessionId),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...conversations,
      contactSession,
      page: conversations.page.map((conversation) => ({
        _id: conversation._id,
        _creationTime: conversation._creationTime,
        lastUpdatedAt: conversation.lastMessageAt ?? conversation.createdAt,
        status: conversation.status,
        organizationId: conversation.organizationId,
        threadId: conversation.threadId,
        lastMessage: conversation.lastMessage ?? null,
      })),
    };
  },
});
