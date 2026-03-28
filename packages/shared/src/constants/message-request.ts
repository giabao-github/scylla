export const MESSAGE_REQUEST_STATUS = {
  PROCESSING: "processing",
  COMPLETED: "completed",
  ERROR: "error",
} as const;

export type MessageRequestStatus =
  (typeof MESSAGE_REQUEST_STATUS)[keyof typeof MESSAGE_REQUEST_STATUS];
