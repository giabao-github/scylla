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

  const country = ct.getCountry(countryCode as string);

  return {
    code: countryCode,
    name: country?.name || countryCode,
  };
}

export function getCountryFlagUrl(countryCode: string) {
  return `https://flagcdn.com/w160/${countryCode.toLowerCase()}.png`;
}
