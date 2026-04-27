import { createTool, saveMessage } from "@convex-dev/agent";
import { FunctionReference } from "convex/server";
import { ConvexError } from "convex/values";
import z from "zod";

import { components, internal } from "@workspace/backend/_generated/api";

export const createConversationTool = (options: {
  description: string;
  action: "escalate" | "resolve";
  mutation: FunctionReference<
    "mutation",
    "internal",
    {
      threadId: string;
    },
    boolean,
    string | undefined
  >;
  confirmationMessage: string;
}) => {
  return createTool({
    description: options.description,
    inputSchema: z.object({}),
    execute: async (ctx) => {
      if (!ctx.threadId) {
        throw new ConvexError({
          message: `Cannot ${options.action} conversation: missing thread ID`,
          code: "MISSING_THREAD_ID",
        });
      }

      const didTransition = await ctx.runMutation(options.mutation, {
        threadId: ctx.threadId,
      });

      if (didTransition) {
        let savedMessage;
        try {
          ({ message: savedMessage } = await saveMessage(
            ctx,
            components.agent,
            {
              threadId: ctx.threadId,
              message: {
                role: "assistant",
                content: options.confirmationMessage,
              },
            },
          ));
        } catch (err) {
          console.error(
            `[createConversationTool] Status updated but confirmation message failed for thread [${ctx.threadId}]:`,
            err,
          );
          return options.confirmationMessage;
        }

        try {
          await ctx.runMutation(
            internal.system.conversations.updateLastMessage,
            {
              threadId: ctx.threadId,
              lastMessage: {
                role: "assistant",
                text: options.confirmationMessage,
              },
              messageAt: savedMessage._creationTime,
            },
          );
        } catch (err) {
          console.error(
            `[createConversationTool] Confirmation message saved but lastMessage update failed for thread [${ctx.threadId}]:`,
            err,
          );
        }
      }

      return options.confirmationMessage;
    },
  });
};
