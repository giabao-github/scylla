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

const ENHANCE_TIMEOUT_MS = 30_000;
const MAX_PROMPT_LENGTH = 10_000;

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

    if (!conversation || conversation.organizationId !== organizationId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (conversation.status === CONVERSATION_STATUS.RESOLVED) {
      throw new ConvexError({
        code: "CONVERSATION_RESOLVED",
        message: "Conversation resolved",
      });
    }

    if (!prompt.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Prompt cannot be empty",
      });
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Prompt exceeds maximum length (${MAX_PROMPT_LENGTH} characters)`,
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

    let savedMessage;
    try {
      ({ message: savedMessage } = await saveMessage(ctx, components.agent, {
        threadId: conversation.threadId,
        agentName: identity.name ?? identity.familyName ?? "Operator",
        message: { role: "assistant", content: prompt },
      }));
    } catch (err) {
      try {
        await ctx.runMutation(
          internal.system.messageRequests.removeStaleRequest,
          {
            requestId,
          },
        );
      } catch (cleanupErr) {
        console.error(
          `Failed to remove stale request [${requestId}] after saveMessage failure:`,
          cleanupErr instanceof Error ? cleanupErr.message : cleanupErr,
        );
      }
      throw err;
    }

    // Post-generation sync
    try {
      await ctx.runMutation(internal.system.conversations.updateLastMessage, {
        threadId: conversation.threadId,
        lastMessage: { role: "assistant", text: prompt },
        messageAt: savedMessage._creationTime,
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

    if (!conversation || conversation.organizationId !== organizationId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
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

    if (prompt.length > MAX_PROMPT_LENGTH) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Prompt exceeds maximum length (${MAX_PROMPT_LENGTH} characters)`,
      });
    }

    try {
      // TODO: implement rate limiting / usage tracking to prevent AI cost abuse
      const response = await generateText({
        model: google("gemini-flash-lite-latest"),
        messages: [
          { role: "system", content: enhancePrompt },
          { role: "user", content: prompt },
        ],
        abortSignal: AbortSignal.timeout(ENHANCE_TIMEOUT_MS),
      });

      if (!response.text.trim()) {
        throw new ConvexError({
          code: "AI_ERROR",
          message: "Failed to generate enhanced response",
        });
      }

      return response.text;
    } catch (err) {
      if (err instanceof ConvexError) throw err;

      if (err instanceof Error && err.name === "TimeoutError") {
        console.error("AI enhancement timed out");
        throw new ConvexError({
          code: "AI_TIMEOUT",
          message: "Enhancement request timed out",
        });
      }

      console.error("AI enhancement failed:", err);
      throw new ConvexError({
        code: "AI_ERROR",
        message: "Failed to enhance response",
      });
    }
  },
});
