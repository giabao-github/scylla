import { cronJobs } from "convex/server";

import { internal } from "@workspace/backend/_generated/api";

const crons = cronJobs();

crons.cron(
  "Purge expired contact sessions",
  "0 * * * *",
  internal.contactSessionCleanup.purgeExpiredContactSessions,
  {},
);

crons.cron(
  "Resume stuck organization deletions",
  "*/30 * * * *",
  internal.system.organizations.resumeStaleDeletions,
  {},
);

export default crons;
