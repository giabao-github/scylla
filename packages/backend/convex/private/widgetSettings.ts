import { v } from "convex/values";

import { mutation, query } from "@workspace/backend/_generated/server";
import { getAuthenticatedOrgId } from "@workspace/backend/private/utils";

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
    const { organizationId } = await getAuthenticatedOrgId(ctx);

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
