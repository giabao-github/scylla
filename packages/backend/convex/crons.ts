import { cronJobs } from "convex/server";

import { internal } from "@workspace/backend/_generated/api";

const crons = cronJobs();

/**
 * Run the expired-session purge every hour.
 * Adjust the cron expression to suit your retention requirements
 * (e.g. "0 * * * *"  = top of every hour).
 */

crons.cron(
  "purgeExpiredContactSessions",
  "0 * * * *",
  internal.contactSessionCleanup.purgeExpiredContactSessions,
  {},
);

export default crons;
