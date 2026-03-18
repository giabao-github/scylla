import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { Agent } from "@convex-dev/agent";
import type { LanguageModel } from "ai";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { components, internal } from "@workspace/backend/_generated/api";
import { action, query } from "@workspace/backend/_generated/server";
import { supportAgent } from "@workspace/backend/system/ai/agents/supportAgent";
import { getThreadById } from "@workspace/backend/system/conversations";

import { CONVERSATION_STATUS } from "@workspace/shared/constants/conversation";
import { modelCatalog } from "@workspace/shared/constants/model-catalog";

const ALLOWED_MODEL_IDS = new Set<string>(modelCatalog.map((m) => m.id));

const resolveModel = (modelId: string): LanguageModel => {
  if (!ALLOWED_MODEL_IDS.has(modelId)) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: `Unsupported model: ${modelId}`,
    });
  }
  const entry = modelCatalog.find((m) => m.id === modelId)!;
  if (entry.chefSlug === "openai") return openai.chat(modelId);
  if (entry.chefSlug === "google") return google.chat(modelId);
  throw new ConvexError({
    code: "BAD_REQUEST",
    message: `No provider for model: ${modelId}`,
  });
};

const agentForModel = (modelId: string | undefined): typeof supportAgent =>
  modelId
    ? new Agent(components.agent, {
        ...supportAgent.options,
        languageModel: resolveModel(modelId),
      })
    : supportAgent;

export const create = action({
  args: {
    threadId: v.string(),
    contactSessionId: v.id("contactSessions"),
    prompt: v.string(),
    modelId: v.optional(v.string()),
    requestId: v.string(),
  },
  handler: async (
    ctx,
    { threadId, contactSessionId, prompt, modelId, requestId },
  ): Promise<void> => {
    const contactSession = await ctx.runQuery(
      internal.system.contactSessions.getOne,
      { contactSessionId },
    );

    if (!contactSession) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }

    if (contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Expired session",
      });
    }

    const conversation = await ctx.runQuery(
      internal.system.conversations.getThreadByIdQuery,
      { threadId },
    );

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (conversation.contactSessionId !== contactSessionId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Not authorized to access this conversation",
      });
    }

    if (conversation.status === CONVERSATION_STATUS.RESOLVED) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Conversation resolved",
      });
    }

    const { duplicate } = await ctx.runMutation(
      internal.system.messageRequests.claim,
      { requestId, contactSessionId },
    );

    if (duplicate) return;

    // TODO: implement subscription check

    await ctx.runMutation(internal.system.conversations.updateLastMessage, {
      threadId,
      lastMessage: { text: prompt, role: "user" },
    });

    try {
      const agent = agentForModel(modelId);
      const { thread } = await agent.continueThread(ctx, { threadId });
      const result = await thread.generateText({ prompt } as any);

      // Patch assistant response after generation
      await ctx.runMutation(internal.system.conversations.updateLastMessage, {
        threadId,
        lastMessage: { text: result.text, role: "assistant" },
      });
    } catch (err) {
      // Release the claim so the client can retry with the same requestId
      await ctx.runMutation(internal.system.messageRequests.release, {
        requestId,
      });
      throw err;
    }
  },
});

export const getMany = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const contactSession = await ctx.db.get(args.contactSessionId);

    if (!contactSession) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }

    if (contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Expired session",
      });
    }

    const conversation = await getThreadById(ctx, args.threadId);

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (conversation.contactSessionId !== args.contactSessionId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Not authorized to access this conversation",
      });
    }

    const paginated = await supportAgent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });

    return paginated;
  },
});
