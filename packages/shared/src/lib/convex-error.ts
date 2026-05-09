import { ConvexError } from "convex/values";

export const hasErrorCode = <T extends string>(
  error: unknown,
  code: T,
): error is ConvexError<{ code: T }> => {
  if (!(error instanceof ConvexError)) return false;
  const data = error.data;
  if (typeof data !== "object" || data === null) return false;
  const errorCode = (data as { code?: unknown }).code;
  return typeof errorCode === "string" && errorCode === code;
};
