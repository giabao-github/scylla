import { saveMessage } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { components } from "@workspace/backend/_generated/api";
import { mutation, query } from "@workspace/backend/_generated/server";
import { supportAgent } from "@workspace/backend/system/ai/agents/supportAgent";

import { CONVERSATION_STATUS } from "@workspace/shared/constants/conversation";

import { validateSession } from "./utils";

export const create = mutation({
  args: {
    organizationId: v.string(),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(
      ctx,
      args.contactSessionId,
      args.organizationId,
    );

    const { threadId } = await supportAgent.createThread(ctx, {
      userId: args.organizationId,
    });

    const initialMessage = "Hello, how can I help you today?";

    await saveMessage(ctx, components.agent, {
      threadId,
      message: {
        role: "assistant",
        // TODO: Later modify to widget settings' initial message
        content: initialMessage,
      },
    });

    const now = Date.now();

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
      .withIndex("by_contact_session_id", (q) =>
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
        lastUpdatedAt: conversation.updatedAt ?? conversation.createdAt,
        status: conversation.status,
        organizationId: conversation.organizationId,
        threadId: conversation.threadId,
        lastMessage: conversation.lastMessage ?? null,
      })),
    };
  },
});
