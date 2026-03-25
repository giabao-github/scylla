import { createTool, saveMessage } from "@convex-dev/agent";
import { ConvexError } from "convex/values";
import { z } from "zod";

import { components, internal } from "@workspace/backend/_generated/api";

export const escalateConversation = createTool({
  description:
    "Escalate the conversation to a human operator. Use this when the user explicitly requests a human, when the issue is too complex to resolve automatically, or when the user expresses frustration or dissatisfaction with automated responses.",
  args: z.object({}),
  handler: async (ctx) => {
    if (!ctx.threadId) {
      throw new ConvexError({
        message: "Cannot escalate conversation: missing thread ID",
        code: "MISSING_THREAD_ID",
        context: { threadId: ctx.threadId },
      });
    }

    await saveMessage(ctx, components.agent, {
      threadId: ctx.threadId,
      message: {
        role: "assistant",
        content: "Conversation escalated to a human operator.",
      },
    });

    await ctx.runMutation(internal.system.conversations.escalate, {
      threadId: ctx.threadId,
    });

    return "Conversation escalated to a human operator.";
  },
});
