export function migrateStorageKey(oldKey: string, newKey: string): void {
  if (typeof window === "undefined") return;
  if (oldKey === newKey) return;
  try {
    const existing = localStorage.getItem(newKey);
    if (existing !== null) return;

    const old = localStorage.getItem(oldKey);
    if (old === null) return;

    localStorage.setItem(newKey, old);
    localStorage.removeItem(oldKey);
  } catch (error) {
    // localStorage unavailable (SSR, private mode, etc.) — non-fatal
    console.warn("Storage key migration failed", { oldKey, newKey, error });
  }
}
