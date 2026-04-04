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
  "Cleanup stale message requests",
  "0 0 * * *",
  internal.system.messageRequests.cleanup,
  {},
);

crons.cron(
  "Resume stuck organization deletions",
  "*/30 * * * *",
  internal.system.organizations.resumeStaleDeletions,
  {},
);

crons.cron(
  "Cleanup pending file deletions",
  "*/15 * * * *",
  internal.pendingDeletions.processPendingDeletions,
  {},
);

crons.cron(
  "Cleanup stale orphans",
  "0 * * * *",
  internal.orphanCleanup.cleanupStaleOrphans,
  {},
);

export default crons;
