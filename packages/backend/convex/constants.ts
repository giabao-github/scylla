// Contact session
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
export const AUTO_REFRESH_THRESHOLD_MS = 5 * 60 * 60 * 1000;

// Message
export const MAX_TOOL_CALL_ITERATIONS = 5;
export const MAX_REQUEST_IDS = 100;
export const MAX_PROMPT_LENGTH = 10_000;
export const UPDATED_AT_THROTTLE_MS = 5_000;
export const STALE_TIMEOUT_MS = 30_000;

// Webhooks
export const MESSAGE_REQUEST_BATCH = 500;
export const MAX_BATCHES_PER_PARENT = 20;

// Secrets
export const ORG_ID_PATTERN = /^org_[a-zA-Z0-9]+$/;

// Cleanup
export const CLEANUP_BATCH_SIZE = 100;

// Deletion
export const DELETION_BATCH_SIZE = 20;
export const MAX_RETRIES = 3;

// Subscription
export const FREE_MAX_MEMBERS = 1;
export const PRO_MAX_MEMBERS = 5;
