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

      const threadId = ctx.threadId;

      const didTransition = await ctx.runMutation(options.mutation, {
        threadId,
      });

      if (didTransition) {
        const saveConfirmationMessage = async () => {
          try {
            const { message } = await saveMessage(ctx, components.agent, {
              threadId,
              message: {
                role: "assistant",
                content: options.confirmationMessage,
              },
            });

            return message;
          } catch (err) {
            console.error(
              `[createConversationTool] Status updated but confirmation message failed for thread [${threadId}]:`,
              err,
            );
            return null;
          }
        };

        const savedMessage = await saveConfirmationMessage();

        try {
          await ctx.runMutation(
            internal.system.conversations.updateLastMessage,
            {
              threadId,
              lastMessage: {
                role: "assistant",
                text: options.confirmationMessage,
              },
              messageAt: savedMessage?._creationTime ?? Date.now(),
            },
          );
        } catch (err) {
          console.error(
            `[createConversationTool] Confirmation message saved but lastMessage update failed for thread [${threadId}]:`,
            err,
          );
        }
      }

      return options.confirmationMessage;
    },
  });
};
