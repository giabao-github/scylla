import { v } from "convex/values";
import z from "zod";

import { internal } from "@workspace/backend/_generated/api";
import { action } from "@workspace/backend/_generated/server";
import {
  getSecretValue,
  parseSecretString,
} from "@workspace/backend/lib/secrets";

export const getVapiSecrets = action({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const plugin = await ctx.runQuery(
      internal.system.plugins.getByOrgIdAndService,
      {
        organizationId: args.organizationId,
        service: "vapi",
      },
    );

    if (!plugin) {
      return null;
    }

    try {
      const secretName = plugin.secretName;
      if (!secretName) {
        console.warn("[public:secrets] Plugin has no secretName configured");
        return null;
      }

      const secret = await getSecretValue(secretName);
      const secretData = parseSecretString(
        secret,
        z.object({
          privateApiKey: z
            .string()
            .trim()
            .min(1, "Vapi private API key is required"),
          publicApiKey: z
            .string()
            .trim()
            .min(1, "Vapi public API key is required"),
        }),
      );

      if (!secretData) {
        console.warn("[public:secrets] Secret data is not found");
        return null;
      }

      return {
        publicApiKey: secretData.publicApiKey,
      };
    } catch (error) {
      console.warn(
        "[public:secrets] Unable to load Vapi secrets:",
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  },
});
