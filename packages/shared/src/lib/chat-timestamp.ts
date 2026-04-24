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

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const getStartOfWeek = (value: Date) => {
  const startOfWeek = new Date(value);
  const dayOfWeek = value.getDay();
  const diffToMonday = (dayOfWeek + 6) % 7;

  startOfWeek.setDate(value.getDate() - diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  return startOfWeek;
};

export const formatChatTimestamp = (timestamp: number) => {
  const messageDate = new Date(timestamp);
  if (isNaN(messageDate.getTime())) {
    return "";
  }
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
