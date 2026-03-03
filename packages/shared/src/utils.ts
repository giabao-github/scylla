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

export function validateInput(type: Input = "name", value: string) {
  if (typeof value !== "string" || value.trim() === "") {
    return false;
  }

  // Reject emojis for all types
  if (PATTERNS.emoji.test(value)) {
    return false;
  }

  switch (type) {
    case "input": {
      return true;
    }

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

    case "username": {
      // Reject any spaces
      if (/\s/.test(value)) {
        return false;
      }
      return true;
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

    case "phone": {
      // Vietnamese phone numbers: start with 0 and have 10-11 digits
      return /^0\d{9,10}$/.test(value.trim());
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

    case "username": {
      return value.replace(/\s/g, "");
    }

    case "phone": {
      return value.replace(/\D/g, "");
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

export async function getVendor(nav: NavigatorWithUAData, ua: string): Promise<string> {
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
      (b: NavigatorUABrandVersion) =>
        !/(not.a.brand|chromium)/i.test(b.brand),
    );
    if (brand && !isBrave) {
      return brand.brand;
    } 
  }

  // Brave: spoofs as Chrome in UA — must check before Chrome
  if (isBrave) return "Brave";
  // These all contain "Chrome" in UA — must come before the Chrome check
  if (/OPR|Opera/i.test(ua)) return "Opera";
  if (/YaBrowser/i.test(ua)) return "Yandex";
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/UCBrowser/i.test(ua)) return "UC Browser";
  if (/Vivaldi/i.test(ua)) return "Vivaldi";
  // Generic checks
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Edg/i.test(ua)) return "Edge";
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua)) return "Safari";
  return "Unknown";
}
