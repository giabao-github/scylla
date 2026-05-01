import { createTool, saveMessage } from "@convex-dev/agent";
import { FunctionReference } from "convex/server";
import { ConvexError } from "convex/values";
import z from "zod";

import { components } from "@workspace/backend/_generated/api";

export const createConversationTool = (options: {
  description: string;
  action: "escalate" | "resolve";
  mutation: FunctionReference<
    "mutation",
    "internal",
    {
      threadId: string;
      lastMessage: {
        role: "assistant";
        text: string;
      };
      messageAt: number;
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

      const threadId = ctx.threadId;
      const messageAt = Date.now();

      const didTransition = await ctx.runMutation(options.mutation, {
        threadId,
        lastMessage: {
          role: "assistant",
          text: options.confirmationMessage,
        },
        messageAt,
      });

      if (didTransition) {
        try {
          await saveMessage(ctx, components.agent, {
            threadId,
            message: {
              role: "assistant",
              content: options.confirmationMessage,
            },
          });
        } catch (err) {
          console.error(
            `[createConversationTool] Status updated but confirmation message failed for thread [${threadId}]:`,
            err,
          );
        }
      }

      return options.confirmationMessage;
    },
  });
};
