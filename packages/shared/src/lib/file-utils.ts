const formatterCache = new Map<string, Intl.NumberFormat>();

const getFormatter = (digits: number, locale: string = "en-US") => {
  const key = `${locale}-${digits}`;

  let formatter = formatterCache.get(key);

  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    });
    formatterCache.set(key, formatter);
  }

  return formatter;
};

export const formatFileSize = (bytes: number, locale = "en-US") => {
  if (!Number.isFinite(bytes) || bytes < 0) {
    throw new RangeError("File size must be a non-negative finite number");
  }

  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let size = bytes;
  let i = 0;

  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }

  let digits = 0;

  if (i === 0) {
    digits = 0;
  } else if (size < 10) {
    digits = 2;
  } else if (size < 100) {
    digits = 1;
  } else {
    digits = 0;
  }

  const formatter = getFormatter(digits, locale);

  return `${formatter.format(size)} ${units[i]}`;
};

const toHexString = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export const computeFileHash = async (file: File): Promise<string> => {
  if (typeof window !== "undefined" && "DigestStream" in window) {
    const digestStream = new (window as any).DigestStream("SHA-256");
    await file.stream().pipeTo(digestStream);
    const hashBuffer: ArrayBuffer = await digestStream.digest;
    return toHexString(hashBuffer);
  }

  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return toHexString(hashBuffer);
};
