"use node";

import { ConvexError, v } from "convex/values";

import { internal } from "@workspace/backend/_generated/api";
import { internalAction } from "@workspace/backend/_generated/server";
import {
  deleteSecretValue,
  upsertSecretValue,
} from "@workspace/backend/lib/secrets";

const ORG_ID_PATTERN = /^org_[a-zA-Z0-9]+$/;

export const upsert = internalAction({
  args: {
    organizationId: v.string(),
    service: v.literal("vapi"),
    value: v.object({
      publicApiKey: v.string(),
      privateApiKey: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    if (!ORG_ID_PATTERN.test(args.organizationId)) {
      throw new ConvexError({
        code: "INVALID_ORG_ID",
        message: "Invalid organization ID",
      });
    }

    const value = {
      publicApiKey: args.value.publicApiKey.trim(),
      privateApiKey: args.value.privateApiKey.trim(),
    };

    if (!value.publicApiKey || !value.privateApiKey) {
      throw new ConvexError({
        code: "INVALID_API_KEYS",
        message: "API keys cannot be empty",
      });
    }

    const secretName = `tenant/${args.organizationId}/${args.service}`;

    try {
      await upsertSecretValue(secretName, value);
    } catch (error) {
      console.error(`Failed to upsert secret ${secretName}:`, error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError({
        code: "SECRET_UPSERT_FAILED",
        message: "Failed to upsert secret credentials",
      });
    }

    const existingPlugin = await ctx.runQuery(
      internal.system.plugins.getByOrgIdAndService,
      {
        organizationId: args.organizationId,
        service: args.service,
      },
    );

    try {
      await ctx.runMutation(internal.system.plugins.upsert, {
        organizationId: args.organizationId,
        service: args.service,
        secretName,
      });
    } catch (error) {
      console.error(`Failed to upsert plugin ${secretName}:`, error);

      if (!existingPlugin) {
        try {
          await deleteSecretValue(secretName);
        } catch (rollbackError) {
          console.error(
            `[CRITICAL ALERT] Orphaned AWS Secret detected!\n` +
              `Both plugin upsert and subsequent AWS rollback failed.\n` +
              `Manual cleanup required in AWS Secrets Manager for: ${secretName}.\n` +
              `Error details:`,
            rollbackError,
          );
        }
      }

      throw new ConvexError({
        code: "PLUGIN_UPSERT_FAILED",
        message: "Failed to upsert plugin",
      });
    }

    return { status: "success" };
  },
});

export const deleteSecret = internalAction({
  args: { secretName: v.string() },
  handler: async (_ctx, args) => {
    try {
      await deleteSecretValue(args.secretName);
    } catch (error) {
      console.error(
        `[CRITICAL ALERT] Orphaned AWS Secret detected!\n` +
          `Failed to delete secret after plugin removal.\n` +
          `Manual cleanup required in AWS Secrets Manager for: ${args.secretName}.\n` +
          `Error details:`,
        error,
      );
      throw error;
    }
  },
});

export const deleteSecretIfUnreferenced = internalAction({
  args: {
    organizationId: v.string(),
    service: v.literal("vapi"),
    secretName: v.string(),
  },
  handler: async (ctx, { organizationId, service, secretName }) => {
    const currentPlugin = await ctx.runQuery(
      internal.private.plugins.getPluginByOrgAndServiceQuery,
      { organizationId, service },
    );

    if (currentPlugin) {
      console.info(
        `[deleteSecretIfUnreferenced] Plugin for [${organizationId}/${service}] ` +
          `was reconnected — skipping secret deletion.`,
      );
      return;
    }

    try {
      await deleteSecretValue(secretName);
    } catch (error) {
      console.error(
        `[CRITICAL ALERT] Orphaned AWS Secret detected!\n` +
          `Failed to delete secret after plugin removal.\n` +
          `Manual cleanup required in AWS Secrets Manager for: ${secretName}.\n` +
          `Error details:`,
        error,
      );
      throw error;
    }
  },
});
