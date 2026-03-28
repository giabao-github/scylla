import { createTool, saveMessage } from "@convex-dev/agent";
import { ConvexError } from "convex/values";
import { z } from "zod";

import { components, internal } from "@workspace/backend/_generated/api";

export const resolveConversation = createTool({
  description:
    "Resolve and close the conversation. Use this when the user's issue has been fully addressed, the user confirms they're satisfied, or there are no further questions remaining.",
  args: z.object({}),
  handler: async (ctx) => {
    if (!ctx.threadId) {
      throw new ConvexError({
        message: "Cannot resolve conversation: missing thread ID",
        code: "MISSING_THREAD_ID",
      });
    }

    await ctx.runMutation(internal.system.conversations.resolve, {
      threadId: ctx.threadId,
    });

    await saveMessage(ctx, components.agent, {
      threadId: ctx.threadId,
      message: {
        role: "assistant",
        content: "Conversation resolved.",
      },
    });

    return "Conversation resolved.";
  },
});
