import * as ct from "countries-and-timezones";

export function getCountryFromTimezone(
  timezone?: string,
): { code: string; name: string } | null {
  if (!timezone) {
    return null;
  }

  const timezoneInfo = ct.getTimezone(timezone);
  if (!timezoneInfo) {
    return null;
  }

  const countryCode = timezoneInfo.countries[0];
  if (!countryCode) {
    return null;
  }

  const country = ct.getCountry(countryCode);

  return {
    code: countryCode,
    name: country?.name || countryCode,
  };
}

export function getCountryFromCode(
  code: string,
): { code: string; name: string } | null {
  const normalized = normalizeCountryCode(code);
  if (!normalized) {
    return null;
  }

  const country = ct.getCountry(normalized);
  if (!country) {
    return null;
  }

  return {
    code: normalized,
    name: country.name,
  };
}

export function getCountryFlagUrl(countryCode: string): string | null {
  const normalized = normalizeCountryCode(countryCode);
  if (!normalized) {
    return null;
  }
  return `https://flagcdn.com/w160/${normalized.toLowerCase()}.png`;
}

export function normalizeCountryCode(code: string | undefined): string | null {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return null;
  return normalized;
}
