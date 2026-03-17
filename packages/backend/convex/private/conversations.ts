import { MessageDoc } from "@convex-dev/agent";
import { PaginationResult, paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { Doc } from "@workspace/backend/_generated/dataModel";
import { query } from "@workspace/backend/_generated/server";
import { supportAgent } from "@workspace/backend/system/ai/agents/supportAgent";

import {
  CONVERSATION_STATUS,
  ConversationStatus,
} from "@workspace/shared/constants/conversation";

export const getMany = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(
      v.union(
        v.literal(CONVERSATION_STATUS.UNRESOLVED),
        v.literal(CONVERSATION_STATUS.ESCALATED),
        v.literal(CONVERSATION_STATUS.RESOLVED),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User is not authenticated",
      });
    }

    if (!identity.orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      });
    }

    const organizationId = identity.orgId as string;

    let conversations: PaginationResult<Doc<"conversations">>;

    if (args.status) {
      conversations = await ctx.db
        .query("conversations")
        .withIndex("by_organization_id_and_status", (q) =>
          q
            .eq("organizationId", organizationId)
            .eq("status", args.status as ConversationStatus),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      conversations = await ctx.db
        .query("conversations")
        .withIndex("by_organization_id", (q) =>
          q.eq("organizationId", organizationId),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    const conversationWithAdditionalData = await Promise.all(
      conversations.page.map(async (conversation) => {
        try {
          const contactSession = await ctx.db.get(
            conversation.contactSessionId,
          );

          let lastMessage: MessageDoc | null = null;
          // TODO: Denormalize lastMessageText onto conversations to eliminate this N+1.
          // Update the field inside messages.create action after generateText completes.
          try {
            const messages = await supportAgent.listMessages(ctx, {
              threadId: conversation.threadId,
              paginationOpts: { numItems: 1, cursor: null },
            });
            lastMessage = messages.page[0] ?? null;
          } catch (error) {
            console.warn(
              `Failed to fetch last message for conversation ${conversation._id}: ${error instanceof Error ? error.message : "unknown error"}`,
            );
            lastMessage = null;
          }

          return {
            ...conversation,
            lastMessage,
            contactSession,
          };
        } catch (error) {
          console.warn(
            `Skipping conversation ${conversation._id}: ${error instanceof Error ? error.message : "unknown error"}`,
          );
          return null;
        }
      }),
    );

    const validConversations = conversationWithAdditionalData.filter(
      (c): c is NonNullable<typeof c> => c !== null,
    );

    return {
      ...conversations,
      page: validConversations,
    };
  },
});
