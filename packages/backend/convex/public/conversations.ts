import { saveMessage } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { components } from "@workspace/backend/_generated/api";
import { mutation, query } from "@workspace/backend/_generated/server";
import { validateSession } from "@workspace/backend/public/utils";
import { supportAgent } from "@workspace/backend/system/ai/agents/supportAgent";

import { CONVERSATION_STATUS } from "@workspace/shared/constants/conversation";

export const create = mutation({
  args: {
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.contactSessionId);
    const organizationId = session.organizationId;

    const { threadId } = await supportAgent.createThread(ctx, {
      userId: organizationId,
    });

    const initialMessage = "Hello, how can I help you today?";
    const now = Date.now();

    try {
      await saveMessage(ctx, components.agent, {
        threadId,
        message: {
          role: "assistant",
          content: initialMessage,
        },
      });

      const conversationId = await ctx.db.insert("conversations", {
        contactSessionId: session._id,
        status: CONVERSATION_STATUS.UNRESOLVED,
        organizationId: session.organizationId,
        threadId,
        createdAt: now,
        lastMessage: {
          text: initialMessage,
          role: "assistant",
        },
        lastMessageAt: now,
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

    // Don't throw error, handle in frontend (displays a CTA modal to start a new conversation)
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
    };
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
