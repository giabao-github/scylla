import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { Agent } from "@convex-dev/agent";
import type { LanguageModel } from "ai";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { components, internal } from "@workspace/backend/_generated/api";
import { action, query } from "@workspace/backend/_generated/server";
import { supportAgent } from "@workspace/backend/system/ai/agents/supportAgent";

const resolveModel = (modelId: string): LanguageModel | any => {
  if (modelId.startsWith("gpt-"))
    return openai.chat(modelId) as LanguageModel | any;
  if (modelId.startsWith("gemini-"))
    return google.chat(modelId) as LanguageModel | any;
  return google.chat("gemini-3.1-flash-lite-preview") as LanguageModel | any;
};

const agentForModel = (modelId: string | undefined): any =>
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
  handler: async (ctx, { threadId, contactSessionId, prompt, modelId }) => {
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
      internal.system.conversations.getThreadById,
      { threadId },
    );

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
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
    await thread.generateText({ prompt });
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

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired session",
      });
    }

    const paginated = await supportAgent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });

    return paginated;
  },
});
