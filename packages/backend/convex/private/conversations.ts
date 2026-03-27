import { PaginationResult, paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { Doc } from "@workspace/backend/_generated/dataModel";
import { mutation, query } from "@workspace/backend/_generated/server";
import { getAuthenticatedOrgId } from "@workspace/backend/private/utils";

import {
  CONVERSATION_STATUS,
  ConversationStatus,
} from "@workspace/shared/constants/conversation";

const statusValidator = v.union(
  v.literal(CONVERSATION_STATUS.UNRESOLVED),
  v.literal(CONVERSATION_STATUS.ESCALATED),
  v.literal(CONVERSATION_STATUS.RESOLVED),
);

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
      contactSession: {
        _id: contactSession._id,
        name: contactSession.name,
        metadata: contactSession.metadata
          ? {
              countryCode: contactSession.metadata.countryCode ?? null,
              country: contactSession.metadata.country ?? null,
              timezone: contactSession.metadata.timezone ?? null,
            }
          : null,
      },
    };
  },
});

export const getMany = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthenticatedOrgId(ctx);
    let conversations: PaginationResult<Doc<"conversations">>;

    if (args.status) {
      conversations = await ctx.db
        .query("conversations")
        .withIndex("by_organization_id_and_status_and_last_message_at", (q) =>
          q
            .eq("organizationId", organizationId)
            .eq("status", args.status as ConversationStatus),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      conversations = await ctx.db
        .query("conversations")
        .withIndex("by_organization_id_and_last_message_at", (q) =>
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
            contactSession: {
              _id: contactSession._id,
              name: contactSession.name,
              metadata: contactSession.metadata
                ? {
                    countryCode: contactSession.metadata.countryCode ?? null,
                    country: contactSession.metadata.country ?? null,
                    timezone: contactSession.metadata.timezone ?? null,
                  }
                : null,
            },
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

    const skippedCount =
      conversationWithAdditionalData.length - validConversations.length;

    if (skippedCount > 0) {
      console.warn(
        `Skipped ${skippedCount} conversations in getMany for organization [${organizationId}]`,
      );
    }

    return {
      ...conversations,
      skippedCount,
      page: validConversations,
    };
  },
});

export const updateStatus = mutation({
  args: {
    conversationId: v.id("conversations"),
    status: statusValidator,
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

    if (conversation.status === args.status) {
      return;
    }

    const validTransitions: Record<ConversationStatus, ConversationStatus[]> = {
      [CONVERSATION_STATUS.UNRESOLVED]: [
        CONVERSATION_STATUS.ESCALATED,
        CONVERSATION_STATUS.RESOLVED,
      ],
      [CONVERSATION_STATUS.ESCALATED]: [
        CONVERSATION_STATUS.RESOLVED,
        CONVERSATION_STATUS.UNRESOLVED,
      ],
      [CONVERSATION_STATUS.RESOLVED]: [CONVERSATION_STATUS.UNRESOLVED],
    };

    if (!validTransitions[conversation.status].includes(args.status)) {
      throw new ConvexError({
        code: "INVALID_STATUS_TRANSITION",
        message: "Invalid conversation status transition",
        context: { from: conversation.status, to: args.status },
      });
    }

    await ctx.db.patch(args.conversationId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});
