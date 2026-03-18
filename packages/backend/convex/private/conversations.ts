import { PaginationResult, paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { Doc } from "@workspace/backend/_generated/dataModel";
import { query } from "@workspace/backend/_generated/server";

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

          return {
            ...conversation,
            lastMessage: conversation.lastMessage ?? null,
            contactSession,
          };
        } catch (error) {
          console.error(
            `Failed to process conversation '${conversation._id}':`,
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
      console.error(
        `Skipped ${skipped} conversations in getMany for organization '${organizationId}'`,
      );
    }

    return {
      ...conversations,
      page: validConversations,
    };
  },
});
