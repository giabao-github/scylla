"use node";

import { ConvexError, v } from "convex/values";

import { internal } from "@workspace/backend/_generated/api";
import { internalAction } from "@workspace/backend/_generated/server";
import { ORG_ID_PATTERN } from "@workspace/backend/constants";
import {
  deleteSecretValue,
  upsertSecretValue,
} from "@workspace/backend/lib/secrets";

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

    await upsertSecretValue(secretName, value).catch((error) => {
      console.error(`Failed to upsert secret ${secretName}:`, error);
      throw error instanceof ConvexError
        ? error
        : new ConvexError({
            code: "SECRET_UPSERT_FAILED",
            message: "Failed to upsert secret credentials",
          });
    });

    const existingPlugin = await ctx.runQuery(
      internal.system.plugins.getByOrgIdAndService,
      { organizationId: args.organizationId, service: args.service },
    );

    if (existingPlugin?.secretName === secretName) {
      return { status: "success" };
    }

    await ctx
      .runMutation(internal.system.plugins.upsert, {
        organizationId: args.organizationId,
        service: args.service,
        secretName,
      })
      .catch(async (error) => {
        console.error(`Failed to upsert plugin ${secretName}:`, error);

        const currentPlugin = await ctx.runQuery(
          internal.system.plugins.getByOrgIdAndService,
          { organizationId: args.organizationId, service: args.service },
        );

        if (!currentPlugin) {
          await deleteSecretValue(secretName).catch((rollbackError) => {
            console.error(
              `[CRITICAL ALERT] Orphaned AWS Secret detected!\n` +
                `Both plugin upsert and subsequent AWS rollback failed.\n` +
                `Manual cleanup required in AWS Secrets Manager for: ${secretName}.\n` +
                `Error details:`,
              rollbackError,
            );
          });
        }

        throw new ConvexError({
          code: "PLUGIN_UPSERT_FAILED",
          message: "Failed to upsert plugin",
        });
      });

    return { status: "success" };
  },
});

export const deleteSecret = internalAction({
  args: {
    organizationId: v.string(),
    service: v.literal("vapi"),
    secretName: v.string(),
    connectedAt: v.number(),
  },
  handler: async (
    ctx,
    { organizationId, service, secretName, connectedAt },
  ) => {
    const currentPlugin = await ctx.runQuery(
      internal.private.plugins.getPluginByOrgAndServiceQuery,
      { organizationId, service },
    );

    if (currentPlugin && currentPlugin.lastConnectedAt !== connectedAt) {
      console.info(
        `[deleteSecret] Plugin for [${organizationId}/${service}] ` +
          `was reconnected (connectedAt mismatch) — skipping secret deletion.`,
      );
      return;
    }

    await deleteSecretValue(secretName).catch((error) => {
      console.error(
        `[CRITICAL ALERT] Orphaned AWS Secret detected!\n` +
          `Failed to delete secret after plugin removal.\n` +
          `Manual cleanup required in AWS Secrets Manager for: ${secretName}.\n` +
          `Error details:`,
        error,
      );
      throw error;
    });
  },
});
