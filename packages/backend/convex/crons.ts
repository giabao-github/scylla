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
  "Cleanup orphaned conversations",
  "0 * * * *",
  internal.conversationCleanup.cleanupOrphanedConversations,
  {},
);

crons.daily(
  "Cleanup stale message requests",
  { hourUTC: 0, minuteUTC: 0 },
  internal.system.messageRequests.cleanup,
  {},
);

export default crons;
