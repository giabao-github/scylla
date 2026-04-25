const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
});

const monthDayFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
});

const monthDayYearFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const SUNDAY_FIRST_REGIONS = new Set([
  "BR",
  "CA",
  "HK",
  "IL",
  "IN",
  "JP",
  "KR",
  "MX",
  "PH",
  "SG",
  "TW",
  "US",
  "ZA",
]);

const SATURDAY_FIRST_REGIONS = new Set(["AF", "IR"]);

interface LocaleWeekInfo {
  firstDay?: number;
}

interface WeekInfoLocale extends Intl.Locale {
  getWeekInfo?: () => LocaleWeekInfo;
  weekInfo?: LocaleWeekInfo;
}

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const getDefaultLocale = () => weekdayFormatter.resolvedOptions().locale;

const getRegionForLocale = (locale: string) => {
  try {
    const localeInfo = new Intl.Locale(locale);

    return localeInfo.region ?? localeInfo.maximize().region ?? null;
  } catch {
    return null;
  }
};

const getFirstDayOfWeek = () => {
  const locale = getDefaultLocale();

  try {
    const localeInfo = new Intl.Locale(locale) as WeekInfoLocale;
    const weekInfo =
      typeof localeInfo.getWeekInfo === "function"
        ? localeInfo.getWeekInfo()
        : localeInfo.weekInfo;
    const firstDay = weekInfo?.firstDay;

    if (typeof firstDay === "number" && firstDay >= 1 && firstDay <= 7) {
      return firstDay % 7;
    }
  } catch {
    // Fall back to region-based defaults below.
  }

  const region = getRegionForLocale(locale);

  if (region && SATURDAY_FIRST_REGIONS.has(region)) {
    return 6;
  }

  if (region && SUNDAY_FIRST_REGIONS.has(region)) {
    return 0;
  }

  return 1;
};

const getStartOfWeek = (value: Date) => {
  const startOfWeek = new Date(value);
  const dayOfWeek = value.getDay();
  const firstDayOfWeek = getFirstDayOfWeek();
  const diffToWeekStart = (dayOfWeek - firstDayOfWeek + 7) % 7;

  startOfWeek.setDate(value.getDate() - diffToWeekStart);
  startOfWeek.setHours(0, 0, 0, 0);

  return startOfWeek;
};

export const formatChatTimestamp = (timestamp: number) => {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "";
  }
  const messageDate = new Date(timestamp);
  const now = new Date();

  if (isSameDay(messageDate, now)) {
    return timeFormatter.format(messageDate);
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(messageDate, yesterday)) {
    return `Yesterday at ${timeFormatter.format(messageDate)}`;
  }

  const startOfWeek = getStartOfWeek(now);
  if (
    messageDate >= startOfWeek &&
    messageDate.getFullYear() === now.getFullYear()
  ) {
    return `${weekdayFormatter.format(messageDate)} at ${timeFormatter.format(messageDate)}`;
  }

  if (messageDate.getFullYear() === now.getFullYear()) {
    return `${monthDayFormatter.format(messageDate)} at ${timeFormatter.format(messageDate)}`;
  }

  return `${monthDayYearFormatter.format(messageDate)} at ${timeFormatter.format(messageDate)}`;
};
