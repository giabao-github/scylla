import { ConvexError, v } from "convex/values";

import { Id } from "@workspace/backend/_generated/dataModel";
import {
  QueryCtx,
  mutation,
  query,
} from "@workspace/backend/_generated/server";
import { getAuthenticatedOrganization } from "@workspace/backend/convex/private/utils";

const getAuthorizedContactSession = async (
  ctx: QueryCtx,
  conversationId: Id<"conversations">,
) => {
  const { organizationId } = await getAuthenticatedOrganization(ctx);

  const conversation = await ctx.db.get(conversationId);

  if (!conversation) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Conversation not found",
    });
  }

  if (conversation.organizationId !== organizationId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Not authorized to access this contact",
    });
  }

  const contactSession = await ctx.db.get(conversation.contactSessionId);

  if (!contactSession) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Contact session not found",
    });
  }

  if (contactSession.organizationId !== organizationId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Not authorized to access this contact",
    });
  }

  return contactSession;
};

export const getOneByConversationId = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    try {
      return await getAuthorizedContactSession(ctx, args.conversationId);
    } catch (error) {
      if (!(error instanceof ConvexError)) {
        throw error;
      }

      if (error.data?.code === "NOT_FOUND") {
        console.warn(
          `Contact session or conversation not found for conversation [${args.conversationId}]`,
        );
      } else if (error.data?.code === "UNAUTHORIZED") {
        console.warn(
          `Authorization mismatch for conversation [${args.conversationId}]`,
        );
      }
      return null;
    }
  },
});

export const blockContact = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const contactSession = await getAuthorizedContactSession(
      ctx,
      args.conversationId,
    );

    if (contactSession.blockedAt) {
      return;
    }

    await ctx.db.patch(contactSession._id, {
      blockedAt: Date.now(),
    });
  },
});

export const unblockContact = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const contactSession = await getAuthorizedContactSession(
      ctx,
      args.conversationId,
    );

    if (!contactSession.blockedAt) {
      return;
    }

    await ctx.db.patch(contactSession._id, {
      blockedAt: undefined,
    });
  },
});
