import { v } from "convex/values";

import { query } from "@workspace/backend/_generated/server";

export const getByOrganizationId = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const widgetSettings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_org_id", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .unique();

    if (!widgetSettings) return null;

    return {
      greetingMessage: widgetSettings.greetingMessage,
      defaultSuggestions: widgetSettings.defaultSuggestions,
      vapiSettings: widgetSettings.vapiSettings,
    };
  },
});
