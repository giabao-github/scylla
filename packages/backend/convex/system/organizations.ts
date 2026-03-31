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
      .withIndex("by_deletion_status_and_started_at", (q) =>
        q.eq("deletionStatus", "deleting").lt("deletionStartedAt", threshold),
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

    if (stuckOrgs.length === 0) {
      return;
    }

    console.info(
      `[resumeStaleDeletions] Found ${stuckOrgs.length} stuck deletions. Resuming...`,
    );

    let succeeded = 0;
    let failed = 0;
    for (const org of stuckOrgs) {
      try {
        console.info(
          `[resumeStaleDeletions] Resuming deletion for organization: [${org._id}] [${org.organizationId}]`,
        );
        await ctx.runAction(internal.system.webhooks.clerk.removeOrganization, {
          organizationId: org.organizationId,
        });
        succeeded++;
      } catch (error) {
        failed++;
        console.error(
          `[resumeStaleDeletions] Failed to resume deletion for organization [${org._id}]:`,
          error,
        );
      }
    }
    console.info(
      `[resumeStaleDeletions] Completed. Succeeded: ${succeeded}, Failed: ${failed}`,
    );
  },
});
