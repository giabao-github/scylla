import { v } from "convex/values";
import z from "zod";

import { api, internal } from "@workspace/backend/_generated/api";
import { action } from "@workspace/backend/_generated/server";
import {
  getSecretValue,
  parseSecretString,
} from "@workspace/backend/lib/secrets";

export const getVapiSecrets = action({
  args: {
    organizationId: v.string(),
    contactSessionId: v.optional(v.id("contactSessions")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      if (!args.contactSessionId) {
        return null;
      }

      const sessionValidation = await ctx.runQuery(
        api.public.contactSessions.validate,
        {
          contactSessionId: args.contactSessionId,
        },
      );

      if (!sessionValidation.valid) {
        return null;
      }

      const contactSession = sessionValidation.contactSession;

      if (!contactSession) {
        return null;
      }

      const organization = await ctx.runQuery(
        api.public.organizations.getByClerkId,
        {
          clerkOrgId: args.organizationId,
        },
      );

      if (!organization || organization._id !== contactSession.organizationId) {
        return null;
      }
      console.info(
        `[public:secrets] Unauthenticated access via contact session ${args.contactSessionId} for organization ${args.organizationId}`,
      );
    }

    const plugin = await ctx.runQuery(
      internal.system.plugins.getByOrgIdAndService,
      {
        clerkOrgId: args.organizationId,
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
