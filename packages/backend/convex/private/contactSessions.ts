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
      return null;
    }

    const contactSession = await ctx.db.get(conversation.contactSessionId);

    if (!contactSession) {
      console.warn(
        `Contact session not found for conversation [${args.conversationId}]`,
      );
      return null;
    }

    if (contactSession.organizationId !== organizationId) {
      return null;
    }

    return contactSession;
  },
});
