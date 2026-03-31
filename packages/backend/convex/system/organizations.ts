import { v } from "convex/values";

import { internal } from "@workspace/backend/_generated/api";
import {
  internalAction,
  internalQuery,
} from "@workspace/backend/_generated/server";

export const findStuckDeletions = internalQuery({
  args: {
    olderThanMs: v.number(),
  },
  handler: async (ctx, args) => {
    const threshold = Date.now() - args.olderThanMs;
    return await ctx.db
      .query("organizations")
      .withIndex("by_deletion_status", (q) =>
        q.eq("deletionStatus", "deleting"),
      )
      .filter((q) =>
        q.and(
          q.neq(q.field("deletionStartedAt"), undefined),
          q.lt(q.field("deletionStartedAt"), threshold),
        ),
      )
      .take(100);
  },
});

export const resumeStaleDeletions = internalAction({
  args: {},
  handler: async (ctx) => {
    const stuckOrgs = await ctx.runQuery(
      internal.system.organizations.findStuckDeletions,
      { olderThanMs: 10 * 60 * 1000 },
    );

    const orgsWithoutTimestamp = stuckOrgs.filter(
      (o) => o.deletionStartedAt === undefined,
    );

    if (orgsWithoutTimestamp.length > 0) {
      console.warn(
        `[resumeStaleDeletions] ${orgsWithoutTimestamp.length} org(s) in "deleting" state have no deletionStartedAt — skipping. IDs: ${orgsWithoutTimestamp.map((o) => o._id).join(", ")}`,
      );
    }

    const orgsToResume = stuckOrgs.filter(
      (o) => o.deletionStartedAt !== undefined,
    );

    if (orgsToResume.length === 0) {
      return;
    }

    console.info(
      `[resumeStaleDeletions] Found ${orgsToResume.length} stuck deletions. Resuming...`,
    );

    let succeeded = 0;
    let failed = 0;
    for (const org of orgsToResume) {
      try {
        console.info(
          `[resumeStaleDeletions] Resuming deletion for org: ${org._id} (${org.organizationId})`,
        );
        await ctx.runAction(internal.system.webhooks.clerk.removeOrganization, {
          organizationId: org.organizationId,
        });
        succeeded++;
      } catch (error) {
        failed++;
        console.error(
          `[resumeStaleDeletions] Failed to resume deletion for org ${org._id}:`,
          error,
        );
      }
    }
    console.info(
      `[resumeStaleDeletions] Completed. Succeeded: ${succeeded}, Failed: ${failed}`,
    );
  },
});
