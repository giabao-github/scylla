import { ConvexError } from "convex/values";

export const extractErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (!(error instanceof ConvexError)) return fallback;
  if (typeof error.data === "string") return error.data;
  if (typeof error.data === "object" && error.data !== null) {
    const message = (error.data as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  return fallback;
};
