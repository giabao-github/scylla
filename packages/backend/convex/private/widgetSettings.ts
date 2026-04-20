import { ConvexError, v } from "convex/values";

import { mutation, query } from "@workspace/backend/_generated/server";
import {
  getAuthenticatedOrgId,
  requireSubscriptionFeatureAccess,
} from "@workspace/backend/private/utils";

const MAX_SUGGESTION_LENGTH = 200;

const validateSuggestion = (suggestion: string | undefined, name: string) => {
  if (suggestion && suggestion.length > MAX_SUGGESTION_LENGTH) {
    throw new ConvexError({
      code: "INVALID_DEFAULT_SUGGESTION",
      message: `${name} exceeds maximum length of ${MAX_SUGGESTION_LENGTH} characters`,
    });
  }
};

export const getOne = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getAuthenticatedOrgId(ctx);

    const widgetSettings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_org_id", (q) => q.eq("organizationId", organizationId))
      .unique();

    return widgetSettings;
  },
});

export const upsert = mutation({
  args: {
    greetingMessage: v.string(),
    defaultSuggestions: v.object({
      firstSuggestion: v.optional(v.string()),
      secondSuggestion: v.optional(v.string()),
      thirdSuggestion: v.optional(v.string()),
    }),
    vapiSettings: v.object({
      assistantId: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireSubscriptionFeatureAccess(ctx);

    if (args.greetingMessage.length > 500) {
      throw new ConvexError({
        code: "INVALID_GREETING_MESSAGE",
        message: "Greeting message exceeds maximum length of 500 characters",
      });
    }

    validateSuggestion(
      args.defaultSuggestions.firstSuggestion,
      "First suggestion",
    );
    validateSuggestion(
      args.defaultSuggestions.secondSuggestion,
      "Second suggestion",
    );
    validateSuggestion(
      args.defaultSuggestions.thirdSuggestion,
      "Third suggestion",
    );

    if (
      args.vapiSettings.phoneNumber &&
      !/^\+?[1-9]\d{1,14}$/.test(args.vapiSettings.phoneNumber)
    ) {
      throw new ConvexError({
        code: "INVALID_PHONE_NUMBER",
        message: "Invalid phone number format",
      });
    }

    const existingWidgetSettings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_org_id", (q) => q.eq("organizationId", organizationId))
      .unique();

    if (existingWidgetSettings) {
      await ctx.db.patch(existingWidgetSettings._id, {
        greetingMessage: args.greetingMessage,
        defaultSuggestions: args.defaultSuggestions,
        vapiSettings: args.vapiSettings,
      });
      return existingWidgetSettings._id;
    } else {
      return await ctx.db.insert("widgetSettings", {
        organizationId,
        greetingMessage: args.greetingMessage,
        defaultSuggestions: args.defaultSuggestions,
        vapiSettings: args.vapiSettings,
      });
    }
  },
});
