import { google } from "@ai-sdk/google";
import { saveMessage } from "@convex-dev/agent";
import { generateText } from "ai";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { components, internal } from "@workspace/backend/_generated/api";
import { action, mutation, query } from "@workspace/backend/_generated/server";
import { getAuthenticatedOrgId } from "@workspace/backend/private/utils";
import { supportAgent } from "@workspace/backend/system/ai/agents/supportAgent";
import { getConversationByThreadId } from "@workspace/backend/system/utils";

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
    const { identity, organizationId } = await getAuthenticatedOrgId(ctx);

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
        conversationId,
      },
    );

    if (duplicate) return;

    // TODO: implement subscription check

    try {
      await saveMessage(ctx, components.agent, {
        threadId: conversation.threadId,
        agentName: identity.name ?? identity.familyName ?? "Operator",
        message: {
          role: "assistant",
          content: prompt,
        },
      });
    } catch (err) {
      await ctx.runMutation(internal.system.messageRequests.release, {
        requestId,
      });
      throw err;
    }

    // Post-generation sync should not reopen idempotency window
    try {
      await ctx.runMutation(internal.system.conversations.updateLastMessage, {
        threadId: conversation.threadId,
        lastMessage: { text: prompt, role: "assistant" },
        messageAt: Date.now(),
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
    const { organizationId } = await getAuthenticatedOrgId(ctx);

    const conversation = await getConversationByThreadId(ctx, args.threadId);

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

const enhancePrompt = `You are a senior customer support and UX writing specialist for Scylla.

Your task is to REWRITE and POLISH the provided message. 

CRITICAL RULES:
- DO NOT answer the customer's question.
- DO NOT add new information, instructions, or follow-up questions.
- DO NOT add greetings (like "Hello {{name}}") or signatures unless they were in the original text.
- ONLY improve the existing words, grammar, and tone of the input.
- If the input is one sentence, the output should generally be one or two sentences.

Objectives:
- Fix grammar, spelling, and awkward phrasing.
- Ensure a professional, friendly, and human tone.
- Maintain the exact same scope of information as the original.

Output format:
- Provide ONLY the improved text. 
- No explanations, no "Here is the improved version," no conversational filler.
`;

export const enhanceResponse = action({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, { prompt }) => {
    await getAuthenticatedOrgId(ctx);

    if (!prompt.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Prompt cannot be empty",
      });
    }

    const response = await generateText({
      model: google("gemini-flash-lite-latest"),
      messages: [
        {
          role: "system",
          content: enhancePrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return response.text;
  },
});
