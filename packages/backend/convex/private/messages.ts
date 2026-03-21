import { saveMessage } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { components, internal } from "@workspace/backend/_generated/api";
import { mutation, query } from "@workspace/backend/_generated/server";
import { supportAgent } from "@workspace/backend/system/ai/agents/supportAgent";
import { getThreadById } from "@workspace/backend/system/conversations";

import { CONVERSATION_STATUS } from "@workspace/shared/constants/conversation";

export const create = mutation({
  args: {
    prompt: v.string(),
    conversationId: v.id("conversations"),
    requestId: v.string(),
  },
  handler: async (
    ctx,
    { conversationId, prompt, requestId },
  ): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User is not authenticated",
      });
    }

    if (!identity.orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      });
    }

    const organizationId = identity.orgId as string;

    const conversation = await ctx.db.get(conversationId);

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

    if (conversation.status === CONVERSATION_STATUS.RESOLVED) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Conversation resolved",
      });
    }

    if (!prompt.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Prompt cannot be empty",
      });
    }

    const { duplicate } = await ctx.runMutation(
      internal.system.messageRequests.claim,
      {
        requestId,
        contactSessionId: conversation.contactSessionId,
        conversationId,
      },
    );

    if (duplicate) return;

    // TODO: implement subscription check

    await saveMessage(ctx, components.agent, {
      threadId: conversation.threadId,
      agentName: identity.familyName ?? identity.name ?? "Operator",
      message: {
        role: "assistant",
        content: prompt,
      },
    });

    // Post-generation sync should not reopen idempotency window
    try {
      await ctx.runMutation(internal.system.conversations.updateLastMessage, {
        threadId: conversation.threadId,
        lastMessage: { text: prompt, role: "assistant" },
      });
    } catch (err) {
      console.error(
        `Failed to sync the last message for thread '${conversation.threadId}'`,
        err instanceof Error ? err.message : err,
      );
    }
  },
});

export const getMany = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User is not authenticated",
      });
    }

    if (!identity.orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      });
    }

    const organizationId = identity.orgId as string;

    const conversation = await getThreadById(ctx, args.threadId);

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

    const paginated = await supportAgent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });

    return paginated;
  },
});
