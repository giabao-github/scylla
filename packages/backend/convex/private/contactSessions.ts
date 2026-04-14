import { v } from "convex/values";

import { query } from "@workspace/backend/_generated/server";
import { getAuthenticatedOrg } from "@workspace/backend/convex/private/utils";

export const getOneByConversationId = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const organizationId = (await getAuthenticatedOrg(ctx)).organization._id;

    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      return null;
    }

    if (conversation.organizationId !== organizationId) {
      console.warn(
        `Conversation org mismatch for conversation [${args.conversationId}] expected [${organizationId}] got [${conversation.organizationId}]`,
      );
      return null;
    }

    const contactSession = await ctx.db.get(conversation.contactSessionId);

    if (!contactSession) {
      console.warn(
        `Contact session [${conversation.contactSessionId}] not found for conversation [${args.conversationId}]`,
      );
      return null;
    }

    if (contactSession.organizationId !== organizationId) {
      console.warn(
        `Contact session org mismatch for conversation [${args.conversationId}] session [${contactSession._id}] expected [${organizationId}] got [${contactSession.organizationId}]`,
      );
      return null;
    }

    return contactSession;
  },
});
