import { PaginationResult, paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { Doc } from "@workspace/backend/_generated/dataModel";
import { mutation, query } from "@workspace/backend/_generated/server";
import { getAuthenticatedOrgId } from "@workspace/backend/private/utils";

import {
  CONVERSATION_STATUS,
  ConversationStatus,
} from "@workspace/shared/constants/conversation";

export const getOne = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthenticatedOrgId(ctx);
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (conversation.organizationId !== organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User is not authorized to access this conversation",
      });
    }

    const contactSession = await ctx.db.get(conversation.contactSessionId);

    if (!contactSession) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Contact session not found",
      });
    }

    return {
      ...conversation,
      lastMessage: conversation.lastMessage ?? null,
      contactSession,
    };
  },
});

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
    const { organizationId } = await getAuthenticatedOrgId(ctx);
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

          if (!contactSession) {
            console.warn(
              `Skipping conversation [${conversation._id}]: missing contact session [${conversation.contactSessionId}]`,
            );
            return null;
          }

          return {
            ...conversation,
            lastMessage: conversation.lastMessage ?? null,
            contactSession,
          };
        } catch (error) {
          console.warn(
            `Failed to process conversation [${conversation._id}]:`,
            error instanceof Error ? error.message : error,
          );
          return null;
        }
      }),
    );

    const validConversations = conversationWithAdditionalData.filter(
      (c): c is NonNullable<typeof c> => c !== null,
    );

    const skipped =
      conversationWithAdditionalData.length - validConversations.length;

    if (skipped > 0) {
      console.warn(
        `Skipped ${skipped} conversations in getMany for organization [${organizationId}]`,
      );
    }

    return {
      ...conversations,
      page: validConversations,
    };
  },
});

export const updateStatus = mutation({
  args: {
    conversationId: v.id("conversations"),
    status: v.union(
      v.literal(CONVERSATION_STATUS.UNRESOLVED),
      v.literal(CONVERSATION_STATUS.ESCALATED),
      v.literal(CONVERSATION_STATUS.RESOLVED),
    ),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthenticatedOrgId(ctx);

    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (conversation.organizationId !== organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User is not authorized to access this conversation",
      });
    }

    await ctx.db.patch(args.conversationId, {
      status: args.status,
    });
  },
});
