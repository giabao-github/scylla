import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const PATTERNS = {
  // Allows unicode letters, hyphens, apostrophes, and spaces (no digits/symbols)
  name: /^[\p{L}\p{M}'\- ]+$/u,

  // Standard email: local@domain.tld — no special chars except dots/hyphens/underscores/plus in local part
  email: /^[a-zA-Z0-9._+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,

  // Strips anything not valid in a name
  nameStrip: /[^\p{L}\p{M}'\- ]/gu,

  // Strips anything not valid in an email
  emailStrip: /[^a-zA-Z0-9._+\-@]/g,

  // Emoji ranges
  emoji: /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u,
};

type Input = "input" | "name" | "username" | "email" | "phone";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function validateInput(type: Input = "name", value: string) {
  if (typeof value !== "string" || value.trim() === "") {
    return false;
  }

  // Reject emojis for both types
  if (PATTERNS.emoji.test(value)) {
    return false;
  }

  switch (type) {
    case "name": {
      const trimmed = value.trim();

      // Reject consecutive spaces/hyphens
      if (/\s{2,}/.test(trimmed)) {
        return false;
      }
      if (/-{2,}/.test(trimmed)) {
        return false;
      }

      return PATTERNS.name.test(trimmed);
    }

    case "email": {
      const lower = value.trim().toLowerCase();

      // Must have exactly one @
      if ((lower.match(/@/g) || []).length !== 1) {
        return false;
      }

      // Reject consecutive dots
      if (/\.{2,}/.test(lower)) {
        return false;
      }

      // Local part must not start or end with a dot
      const [local] = lower.split("@");
      if (local?.startsWith(".") || local?.endsWith(".")) {
        return false;
      }

      return PATTERNS.email.test(lower);
    }

    default: {
      return false;
    }
  }
}

export function sanitizeInput(type: Input = "name", value: string) {
  if (typeof value !== "string") {
    return "";
  }

  switch (type) {
    case "input": {
      return value.replace(/\s{2,}/g, " ").trim();
    }

    case "name": {
      return value
        .replace(PATTERNS.nameStrip, "") // remove disallowed characters and emojis
        .replace(/\s{2,}/g, " ") // collapse multiple spaces
        .replace(/-{2,}/g, "-") // collapse multiple hyphens
        .trim();
    }

    case "email": {
      let cleaned = value
        .replace(PATTERNS.emailStrip, "") // remove disallowed characters and emojis
        .trim()
        .toLowerCase();

      // If multiple @ signs exist, keep only the first
      const parts = cleaned.split("@");
      if (parts.length > 2) {
        cleaned = parts[0] + "@" + parts.slice(1).join("").replace(/@/g, "");
      }

      // Remove consecutive dots
      cleaned = cleaned.replace(/\.{2,}/g, ".");

      return cleaned;
    }

    default: {
      return value;
    }
  }
}
