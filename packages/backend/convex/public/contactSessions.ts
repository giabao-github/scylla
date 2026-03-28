import { ConvexError, v } from "convex/values";

import { mutation, query } from "@workspace/backend/_generated/server";

import {
  getCountryFromCode,
  normalizeCountryCode,
} from "@workspace/shared/lib/country-utils";
import { sanitizeInput, validateInput } from "@workspace/shared/lib/utils";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    organizationId: v.id("organizations"),
    metadata: v.optional(
      v.object({
        userAgent: v.optional(v.string()),
        language: v.optional(v.string()),
        languages: v.optional(v.array(v.string())),
        platform: v.optional(v.string()),
        vendor: v.optional(v.string()),
        screenResolution: v.optional(v.string()),
        viewportSize: v.optional(v.string()),
        timezone: v.optional(v.string()),
        timezoneOffset: v.optional(v.number()),
        cookieEnabled: v.optional(v.boolean()),
        referrer: v.optional(v.string()),
        currentUrl: v.optional(v.string()),
        country: v.optional(v.string()),
        countryCode: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const sanitizedName = sanitizeInput("name", args.name);
    const sanitizedEmail = sanitizeInput("email", args.email);

    const nameValidation = validateInput("name", sanitizedName);
    const emailValidation = validateInput("email", sanitizedEmail);

    if (!nameValidation.valid) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: nameValidation.message,
      });
    }
    if (!emailValidation.valid) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: emailValidation.message,
      });
    }

    const now = Date.now();
    const expiresAt = now + SESSION_DURATION_MS;

    const sanitizeMetadataString = (key: string, raw: string): string => {
      // Basic XSS sanitization: remove < and >
      let clean = raw.replace(/[<>]/g, "");
      // Prevent javascript: protocol in URL fields and strip query/fragment to avoid leaking sensitive tokens
      if (key.toLowerCase().includes("url") || key === "referrer") {
        clean = clean.trim();
        let prev;
        do {
          prev = clean;
          clean = clean.replace(/^(javascript|data):/i, "").trim();
        } while (clean !== prev);
        clean = clean.split(/[?#]/)[0] ?? "";
      }
      return clean;
    };

    const sanitizedMetadata = args.metadata
      ? (Object.fromEntries(
          Object.entries(args.metadata).map(([key, value]) => {
            if (typeof value === "string") {
              return [key, sanitizeMetadataString(key, value)];
            }
            if (Array.isArray(value)) {
              return [
                key,
                value.map((item) =>
                  typeof item === "string"
                    ? sanitizeMetadataString(key, item)
                    : item,
                ),
              ];
            }
            return [key, value];
          }),
        ) as typeof args.metadata)
      : undefined;

    const rawCountryCode = sanitizedMetadata?.countryCode;
    const normalizedCountryCode =
      normalizeCountryCode(rawCountryCode) ?? undefined;
    const normalizedCountry = normalizedCountryCode
      ? (getCountryFromCode(normalizedCountryCode)?.name ?? undefined)
      : sanitizedMetadata?.country;

    const organization = await ctx.db.get(args.organizationId);

    if (!organization) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    const contactSessionId = await ctx.db.insert("contactSessions", {
      name: sanitizedName,
      email: sanitizedEmail,
      organizationId: args.organizationId,
      expiresAt,
      metadata: sanitizedMetadata
        ? {
            ...sanitizedMetadata,
            countryCode: normalizedCountryCode,
            country: normalizedCountry,
          }
        : undefined,
    });

    return contactSessionId;
  },
});

export const validate = query({
  args: {
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const contactSession = await ctx.db.get(args.contactSessionId);

    if (!contactSession) {
      return { valid: false, reason: "Contact session not found" };
    }

    if (contactSession.expiresAt <= Date.now()) {
      return { valid: false, reason: "Contact session has expired" };
    }

    return { valid: true, contactSession };
  },
});
