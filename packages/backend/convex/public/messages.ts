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

const resolveModel = (modelId: string): LanguageModel => {
  if (modelId.startsWith("gpt-")) return openai.chat(modelId);
  if (modelId.startsWith("gemini-")) return google.chat(modelId);
  throw new ConvexError({
    code: "BAD_REQUEST",
    message: `Unsupported model ID: ${modelId}`,
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
  },
  handler: async (
    ctx,
    { threadId, contactSessionId, prompt, modelId },
  ): Promise<void> => {
    const contactSession = await ctx.runQuery(
      internal.system.contactSessions.getOne,
      { contactSessionId },
    );

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired session",
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

    if (conversation.status === "resolved") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Conversation resolved",
      });
    }

    // TODO: implement subscription check

    const agent = agentForModel(modelId);
    const { thread } = await agent.continueThread(ctx, { threadId });
    await thread.generateText({ prompt } as any);
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
