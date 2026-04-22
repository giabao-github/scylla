import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { Agent, saveMessage } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { components, internal } from "@workspace/backend/_generated/api";
import { action, query } from "@workspace/backend/_generated/server";
import {
  MAX_PROMPT_LENGTH,
  MAX_REQUEST_IDS,
  MAX_TOOL_CALL_ITERATIONS,
} from "@workspace/backend/constants";
import { supportAgent } from "@workspace/backend/system/ai/agents/supportAgent";
import { escalateConversation } from "@workspace/backend/system/ai/tools/escalateConversation";
import { resolveConversation } from "@workspace/backend/system/ai/tools/resolveConversation";
import { search } from "@workspace/backend/system/ai/tools/search";
import { getConversationByThreadId } from "@workspace/backend/system/utils";

import { modelCatalog } from "@workspace/shared/constants/model-catalog";
import { CONVERSATION_STATUS } from "@workspace/shared/types/conversation";

const ALLOWED_MODEL_IDS = new Set<string>(modelCatalog.map((m) => m.id));

type SupportTools = {
  resolveConversation: typeof resolveConversation;
  escalateConversation: typeof escalateConversation;
  search: typeof search;
};

const resolveModel = (modelId: string) => {
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

const agentForModel = (modelId: string | undefined, status: string) => {
  const tools: Partial<SupportTools> = {};

  if (status === CONVERSATION_STATUS.UNRESOLVED) {
    tools.resolveConversation = resolveConversation;
    tools.escalateConversation = escalateConversation;
    tools.search = search;
  }

  const base = modelId
    ? new Agent(components.agent, {
        ...supportAgent.options,
        languageModel: resolveModel(modelId),
        tools,
      })
    : new Agent(components.agent, {
        ...supportAgent.options,
        tools,
      });

  return base;
};

export const create = action({
  args: {
    prompt: v.string(),
    threadId: v.string(),
    contactSessionId: v.id("contactSessions"),
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

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired session",
      });
    }

    const conversation = await ctx.runQuery(
      internal.system.conversations.getByThreadId,
      { threadId },
    );

    if (!conversation || conversation.contactSessionId !== contactSessionId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Not authorized to access this thread",
      });
    }

    if (conversation.status === CONVERSATION_STATUS.RESOLVED) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "This conversation has already been resolved",
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
        message: `Prompt exceeds maximum allowed length of ${MAX_PROMPT_LENGTH}`,
      });
    }

    const result = await ctx.runMutation(
      internal.system.messageRequests.claimAndSaveUserMessage,
      { requestId, contactSessionId },
    );

    if (result.status === "already_done" || result.status === "in_progress") {
      return;
    }

    if (result.status === "conversation_busy") {
      throw new ConvexError({
        code: "MESSAGE_IN_PROGRESS",
        message:
          "Please wait for the current reply to finish before sending another message.",
      });
    }

    const userMessageId =
      result.status === "retry" ? result.userMessageId : null;
    const aiResponseSaved =
      result.status === "retry" ? result.aiResponseSaved : false;

    let userMessageAt = result.status === "retry" ? result.userMessageAt : 0;

    try {
      if (!userMessageId) {
        const { messageId, message } = await saveMessage(
          ctx,
          components.agent,
          {
            threadId,
            message: { role: "user", content: prompt },
          },
        );
        userMessageAt = message._creationTime;

        await ctx.runMutation(
          internal.system.messageRequests.setUserMessageId,
          {
            requestId,
            messageId,
            messageAt: message._creationTime,
          },
        );

        try {
          await ctx.runMutation(internal.system.contactSessions.refresh, {
            contactSessionId,
          });
        } catch (refreshErr) {
          console.error("[create] Failed to refresh contact session", {
            contactSessionId,
            error: refreshErr,
          });
        }

        await ctx.runMutation(internal.system.conversations.updateLastMessage, {
          threadId,
          lastMessage: { text: prompt, role: "user" },
          messageAt: message._creationTime,
        });
      }

      if (conversation.status === CONVERSATION_STATUS.UNRESOLVED) {
        const agent = agentForModel(modelId, conversation.status);
        const { thread } = await agent.continueThread(ctx, { threadId });

        if (
          result.status === "retry" &&
          result.aiResponseSaved &&
          !result.lastMessageSynced
        ) {
          try {
            const lastMsg = await ctx.runQuery(
              internal.system.conversations.getLastAssistantMessage,
              { threadId },
            );
            if (lastMsg?.text) {
              await ctx.runMutation(
                internal.system.conversations.updateLastMessage,
                {
                  threadId,
                  lastMessage: { text: lastMsg.text, role: "assistant" },
                  messageAt: lastMsg._creationTime,
                },
              );
              await ctx.runMutation(
                internal.system.messageRequests.markLastMessageSynced,
                { requestId },
              );
            } else {
              console.warn("[retry] No assistant message found to resync", {
                requestId,
                threadId,
              });
            }
          } catch (err) {
            console.error(
              "[retry] Failed to resync last assistant message",
              err,
            );
          }
        }

        if (!aiResponseSaved) {
          let aiResponse = await thread.generateText({});
          let steps = 0;
          while (
            aiResponse.savedMessages[aiResponse.savedMessages.length - 1]
              ?.finishReason === "tool-calls" &&
            steps < MAX_TOOL_CALL_ITERATIONS
          ) {
            if (aiResponse.text?.trim()) {
              const ts = Math.max(Date.now(), userMessageAt + 1);
              await ctx.runMutation(
                internal.system.conversations.updateLastMessage,
                {
                  threadId,
                  lastMessage: {
                    role: "assistant",
                    text: aiResponse.text.trim(),
                  },
                  messageAt: ts,
                },
              );
            }

            aiResponse = await thread.generateText({});
            steps++;
          }

          if (
            aiResponse.savedMessages[aiResponse.savedMessages.length - 1]
              ?.finishReason === "tool-calls"
          ) {
            console.warn("[AI] Tool call chain truncated", {
              requestId,
              steps,
            });
            throw new ConvexError({
              code: "AI_TOOL_LOOP_LIMIT",
              message: `Assistant did not finish after ${MAX_TOOL_CALL_ITERATIONS} tool rounds`,
            });
          }

          const aiMessageAt = Math.max(Date.now(), userMessageAt + 1);

          if (aiResponse.text) {
            await ctx.runMutation(
              internal.system.messageRequests.markAiResponseSaved,
              { requestId },
            );

            try {
              await ctx.runMutation(
                internal.system.conversations.updateLastMessage,
                {
                  threadId,
                  lastMessage: { text: aiResponse.text, role: "assistant" },
                  messageAt: aiMessageAt,
                },
              );
              await ctx.runMutation(
                internal.system.messageRequests.markLastMessageSynced,
                { requestId },
              );
            } catch (err) {
              console.error(
                "Failed to sync last message after AI generation",
                err,
              );
            }
          }
        }
      }

      await ctx.runMutation(internal.system.messageRequests.updateStatus, {
        requestId,
        status: "completed",
      });
    } catch (err) {
      try {
        await ctx.runMutation(internal.system.messageRequests.updateStatus, {
          requestId,
          status: "error",
        });
      } catch (updateErr) {
        console.error(
          `Failed to update error status for request [${requestId}]:`,
          updateErr,
        );
      }
      console.error("[AI] generation failed", {
        requestId,
        error: err,
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

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired session",
      });
    }

    const conversation = await getConversationByThreadId(ctx, args.threadId);

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

export const getMessageIdsByRequestIds = query({
  args: {
    requestIds: v.array(v.string()),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (
    ctx,
    { requestIds, contactSessionId },
  ): Promise<Record<string, string> | null> => {
    if (requestIds.length > MAX_REQUEST_IDS) {
      console.error("Too many request IDs", {
        count: requestIds.length,
        max: MAX_REQUEST_IDS,
        requestIds: requestIds.slice(0, 10),
      });

      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Too many request IDs (max: ${MAX_REQUEST_IDS})`,
        context: {
          count: requestIds.length,
        },
      });
    }

    const contactSession = await ctx.db.get(contactSessionId);

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      return null;
    }

    const results = await Promise.all(
      requestIds.map((requestId) =>
        ctx.db
          .query("messageRequests")
          .withIndex("by_request_id", (q) => q.eq("requestId", requestId))
          .unique(),
      ),
    );

    return Object.fromEntries(
      results
        .filter(
          (r) =>
            r?.userMessageId != null && r.contactSessionId === contactSessionId,
        )
        .map((r) => [r!.requestId, r!.userMessageId!]),
    );
  },
});
