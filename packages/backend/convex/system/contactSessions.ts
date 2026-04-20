import { ConvexError, v } from "convex/values";

import {
  internalMutation,
  internalQuery,
} from "@workspace/backend/_generated/server";
import {
  AUTO_REFRESH_THRESHOLD_MS,
  SESSION_DURATION_MS,
} from "@workspace/backend/constants";

export const getOne = internalQuery({
  args: {
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contactSessionId);
  },
});

export const refresh = internalMutation({
  args: {
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.contactSessionId);
    const now = Date.now();

    if (!session) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Contact session not found",
      });
    }

    if (session.expiresAt < now) {
      throw new ConvexError({
        code: "EXPIRED",
        message: "Contact session has expired",
      });
    }

    const timeRemaining = session.expiresAt - now;
    if (timeRemaining < AUTO_REFRESH_THRESHOLD_MS) {
      const newExpiresAt = now + SESSION_DURATION_MS;
      await ctx.db.patch(args.contactSessionId, { expiresAt: newExpiresAt });
      return { ...session, expiresAt: newExpiresAt };
    }

    return session;
  },
});
