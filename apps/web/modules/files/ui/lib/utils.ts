import { ConvexError } from "convex/values";

export const extractErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (!(error instanceof ConvexError)) return fallback;

  const data = error.data;

  if (typeof data === "string") return data;

  if (data && typeof data === "object") {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  return fallback;
};
