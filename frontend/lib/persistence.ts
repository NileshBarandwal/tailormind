// Simple localStorage persistence helpers for TailorMind.
// All functions are safe to call in SSR context (check typeof window).

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function jobKey(url: string): string {
  if (!url) return "no_url";
  try {
    return btoa(url).replace(/[^a-zA-Z0-9]/g, "");
  } catch {
    return "invalid_url";
  }
}

export function lsGet<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function lsSet(key: string, value: unknown): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("localStorage.setItem failed:", e);
  }
}

export function lsDel(key: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function lsDelPrefix(prefix: string): void {
  if (!isBrowser()) return;
  try {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(prefix)
    );
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

// Per-job keys
export const JOB_KEYS = {
  structuredResume: (k: string) => `tm_job_${k}_structured_resume`,
  coverLetter:      (k: string) => `tm_job_${k}_cover_letter`,
  card:             (k: string) => `tm_job_${k}_card`,
  companyName:      (k: string) => `tm_job_${k}_company_name`,
  website:          (k: string) => `tm_job_${k}_website`,
};

// Global keys
export const GLOBAL_KEYS = {
  instructions: "tm_instructions",
  previewTab:   "tm_preview_tab",
  chipSelections: "tm_chip_selections",
  additionalText: "tm_additional_text",
  customEmphasis: "tm_custom_emphasis",
  tailoringMigrated: "tm_tailoring_migrated",
};

// Active profile ID — stored in localStorage
export const PROFILE_STORAGE_KEY = "tm_profile_id";

export function getActiveProfileId(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(PROFILE_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function setActiveProfileId(id: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}
