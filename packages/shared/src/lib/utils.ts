const PATTERNS = {
  name: /^[\p{L}\p{M}'\- ]+$/u,
  email: /^[a-zA-Z0-9._+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,
  nameStrip: /[^\p{L}\p{M}'\- ]/gu,
  emailStrip: /[^a-zA-Z0-9._+\-@]/g,
  emojiTest:
    /(?:[\p{Emoji_Presentation}\p{Extended_Pictographic}]|\u200D|\uFE0F)/u,
  emojiStrip:
    /(?:[\p{Emoji_Presentation}\p{Extended_Pictographic}]|\u200D|\uFE0F)/gu,
};

type Input = "input" | "name" | "username" | "email" | "phone";

interface ValidationResult {
  valid: boolean;
  message: string;
}

const pass = (): ValidationResult => ({ valid: true, message: "" });
const fail = (message: string): ValidationResult => ({ valid: false, message });

export function validateInput(
  type: Input = "name",
  value: string,
): ValidationResult {
  if (typeof value !== "string") {
    return fail("Value must be a string");
  }

  if (value.trim() === "") {
    return fail(
      `${type.charAt(0).toUpperCase() + type.slice(1)} cannot be empty`,
    );
  }

  if (PATTERNS.emojiTest.test(value)) {
    return fail(
      `${type.charAt(0).toUpperCase() + type.slice(1)} cannot contain emojis`,
    );
  }

  switch (type) {
    case "input": {
      return pass();
    }

    case "name": {
      const trimmed = value.trim();

      if (trimmed.length < 2) {
        return fail("Name must be at least 2 characters");
      }
      if (trimmed.length > 50) {
        return fail("Name must be at most 50 characters");
      }
      if (/\s{2,}/.test(trimmed)) {
        return fail("Name cannot contain consecutive spaces");
      }
      if (/-{2,}/.test(trimmed)) {
        return fail("Name cannot contain consecutive hyphens");
      }
      if (/^[\s\-]/.test(trimmed) || /[\s\-]$/.test(trimmed)) {
        return fail("Name cannot start or end with a space or hyphen");
      }
      if (!PATTERNS.name.test(trimmed)) {
        return fail(
          "Name can only contain letters, hyphens, apostrophes, and spaces",
        );
      }

      return pass();
    }

    case "username": {
      if (value.length < 3) {
        return fail("Username must be at least 3 characters");
      }
      if (value.length > 30) {
        return fail("Username must be at most 30 characters");
      }
      if (/\s/.test(value)) {
        return fail("Username cannot contain spaces");
      }

      return pass();
    }

    case "email": {
      const lower = value.trim().toLowerCase();

      if (lower.length > 254) {
        return fail("Email address is too long (max 254 characters)");
      }

      const atCount = (lower.match(/@/g) || []).length;
      if (atCount === 0) {
        return fail("Email must contain an @ symbol");
      }
      if (atCount > 1) {
        return fail("Email cannot contain more than one @ symbol");
      }

      const [local, domain] = lower.split("@") as [string, string];

      // --- Local part checks ---
      if (local.length === 0) {
        return fail("Missing local part before @");
      }
      if (local.length > 64) {
        return fail("Local part before @ cannot exceed 64 characters");
      }
      if (local.startsWith(".") || local.endsWith(".")) {
        return fail("Local part cannot start or end with a dot");
      }
      if (/\.{2,}/.test(local)) {
        return fail("Local part cannot contain consecutive dots");
      }
      // Disallow special chars at start/end of local (e.g. +foo@ or foo+@)
      if (/^[._+\-]/.test(local) || /[._+\-]$/.test(local)) {
        return fail("Local part cannot start or end with a special character");
      }

      // --- Domain checks ---
      if (!domain || domain.length === 0) {
        return fail("Missing domain part after @");
      }
      if (domain.length > 253) {
        return fail("Domain is too long (max 253 characters)");
      }
      if (!domain.includes(".")) {
        return fail("Domain must include a TLD (e.g. .com)");
      }
      if (/\.{2,}/.test(domain)) {
        return fail("Domain cannot contain consecutive dots");
      }
      if (domain.startsWith(".") || domain.endsWith(".")) {
        return fail("Domain cannot start or end with a dot");
      }

      const labels = domain.split(".");
      for (const label of labels) {
        if (label.length === 0) {
          return fail("Domain contains an empty label");
        }
        if (label.length > 63) {
          return fail(`Domain label "${label}" exceeds 63 characters`);
        }
        if (label.startsWith("-") || label.endsWith("-")) {
          return fail(
            `Domain label "${label}" cannot start or end with a hyphen`,
          );
        }
        if (!/^[a-z0-9-]+$/.test(label)) {
          return fail(
            `Domain label "${label}" contains invalid characters (only letters, numbers, and hyphens are allowed)`,
          );
        }
      }

      // TLD must be purely alphabetic, at least 2 chars
      const tld = labels[labels.length - 1] ?? "";
      if (!/^[a-z]{2,}$/.test(tld)) {
        return fail(
          "TLD must contain only letters and be at least 2 characters (e.g. .com, .io)",
        );
      }

      if (!PATTERNS.email.test(lower)) {
        return fail("Invalid email address format");
      }

      return pass();
    }

    case "phone": {
      const trimmed = value.trim();

      if (!/^\d+$/.test(trimmed)) {
        return fail("Phone number can only contain digits");
      }
      if (!trimmed.startsWith("0")) {
        return fail("Phone number must start with 0");
      }
      if (!/^0\d{9,10}$/.test(trimmed)) {
        return fail("Phone number must be 10-11 digits starting with 0");
      }

      return pass();
    }

    default: {
      return fail("Unknown input type");
    }
  }
}

export function sanitizeInput(type: Input = "name", value: string): string {
  if (typeof value !== "string") {
    return "";
  }

  switch (type) {
    case "input": {
      return value.replace(/\s{2,}/g, " ").trim();
    }

    case "username": {
      return value
        .replace(PATTERNS.emojiStrip, "")
        .replace(/\s/g, "")
        .slice(0, 30);
    }

    case "phone": {
      // Keep only digits, ensure leading 0, cap at 11 digits
      const digits = value.replace(/\D/g, "");
      if (digits.length === 0) {
        return "";
      }
      const normalized = digits.startsWith("0") ? digits : "0" + digits;
      return normalized.slice(0, 11);
    }

    case "name": {
      return value
        .replace(PATTERNS.nameStrip, "") // remove disallowed chars and emojis
        .replace(/\s{2,}/g, " ") // collapse multiple spaces
        .replace(/-{2,}/g, "-") // collapse multiple hyphens
        .replace(/^[\s\-]+|[\s\-]+$/g, "") // strip leading/trailing spaces or hyphens
        .slice(0, 50)
        .trim();
    }

    case "email": {
      let cleaned = value
        .replace(PATTERNS.emailStrip, "") // remove disallowed chars and emojis
        .trim()
        .toLowerCase();

      // If multiple @ signs, keep only the first and collapse the rest
      const parts = cleaned.split("@");
      if (parts.length > 2) {
        cleaned = (parts[0] ?? "") + "@" + parts.slice(1).join("");
      }

      // Remove consecutive dots
      cleaned = cleaned.replace(/\.{2,}/g, ".");

      // Cap at max RFC length
      return cleaned.slice(0, 254);
    }

    default: {
      return value.trim();
    }
  }
}

export interface NavigatorUABrandVersion {
  brand: string;
  version: string;
}

export interface NavigatorUAData {
  platform: string;
  brands: NavigatorUABrandVersion[];
}

export interface NavigatorWithUAData extends Navigator {
  userAgentData?: NavigatorUAData;
  brave?: { isBrave: () => Promise<boolean> };
}

export function getPlatform(nav: NavigatorWithUAData, ua: string): string {
  if (nav.userAgentData?.platform) return nav.userAgentData.platform;
  if (/Win/i.test(ua)) return "Windows";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac/i.test(ua)) return "macOS";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown";
}

export async function getVendor(
  nav: NavigatorWithUAData,
  ua: string,
): Promise<string> {
  let isBrave = false;
  if (nav.brave?.isBrave) {
    try {
      isBrave = await nav.brave.isBrave();
    } catch {
      isBrave = false;
    }
  }

  const brands = nav.userAgentData?.brands;
  if (brands?.length) {
    const brand = brands.find(
      (b: NavigatorUABrandVersion) => !/(not.a.brand|chromium)/i.test(b.brand),
    );
    if (brand && !isBrave) {
      return brand.brand;
    }
  }

  if (isBrave) return "Brave";
  if (/OPR|Opera/i.test(ua)) return "Opera";
  if (/YaBrowser/i.test(ua)) return "Yandex";
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/UCBrowser/i.test(ua)) return "UC Browser";
  if (/Vivaldi/i.test(ua)) return "Vivaldi";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Edg/i.test(ua)) return "Edge";
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua)) return "Safari";
  return "Unknown";
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return `rgba(0, 0, 0, ${Math.max(0, Math.min(1, alpha))})`;
  }
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export const isUnauthorizedError = (error: unknown): boolean => {
  return (
    error instanceof Error &&
    typeof (error as any).data === "object" &&
    (error as any).data !== null &&
    (error as any).data?.code === "UNAUTHORIZED"
  );
};

export const ensureTrailingPeriod = (str: string): string => {
  const trimmed = str.trim();
  if (!trimmed) return "";
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
};

export const parseErrorMessage = (err: unknown): string => {
  const structuredMessage =
    typeof err === "object" &&
    err !== null &&
    "data" in err &&
    typeof (err as { data?: { message?: unknown } }).data?.message === "string"
      ? (err as { data: { message: string } }).data.message
      : null;
  if (structuredMessage?.trim()) return ensureTrailingPeriod(structuredMessage);

  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Something went wrong.";

  const retryMatch = raw.match(/Last error:\s*(.+?)(?:\.\s*For more|$)/);
  if (retryMatch?.[1]) return ensureTrailingPeriod(retryMatch[1]);
  const uncaughtMatch = raw.match(
    /Uncaught\s+\w+:\s*(.+?)(?:\.\s*Called by|$)/,
  );
  if (uncaughtMatch?.[1]) return ensureTrailingPeriod(uncaughtMatch[1]);
  const convexMatch = raw.match(/Server Error\s+(.+?)(?:\s*Called by|$)/);
  if (convexMatch?.[1]) return ensureTrailingPeriod(convexMatch[1]);

  return ensureTrailingPeriod(raw);
};
