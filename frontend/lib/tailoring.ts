import { lsGet, lsSet, lsDel, GLOBAL_KEYS } from "@/lib/persistence";

// ---------------------------------------------------------------------------
// Chip definitions
// ---------------------------------------------------------------------------

export const TAILORING_CHIPS = [
  {
    key: "backend",
    label: "Emphasize backend",
    text: "Emphasize backend engineering experience.",
  },
  {
    key: "ai",
    label: "Prioritize AI projects",
    text: "Prioritize AI and ML projects.",
  },
  {
    key: "academic",
    label: "Reduce academic content",
    text: "Reduce academic project content.",
  },
  {
    key: "deployment",
    label: "Highlight deployment",
    text: "Highlight deployment and production experience.",
  },
  {
    key: "leadership",
    label: "Focus on leadership",
    text: "Focus on leadership and coordination roles.",
  },
  {
    key: "concise",
    label: "Keep concise",
    text: "Keep the resume concise and focused.",
  },
  {
    key: "ats",
    label: "Strong ATS optimization",
    text: "Optimize strongly for ATS keyword matching.",
  },
  {
    key: "quantify",
    label: "Quantify achievements",
    text: "Quantify achievements with numbers where possible.",
  },
  {
    key: "custom",
    label: "Custom emphasis ✎",
    text: null, // special: reveals text input
  },
] as const;

export type ChipKey = (typeof TAILORING_CHIPS)[number]["key"];

// ---------------------------------------------------------------------------
// Compose function — pure, no side effects
// ---------------------------------------------------------------------------

export function composeInstructions(
  chips: Set<string>,
  additional: string,
  customEmphasis: string,
): string {
  const parts: string[] = [];
  Array.from(chips).forEach((key) => {
    if (key === "custom") {
      if (customEmphasis.trim()) {
        parts.push(`Prioritize and emphasize: ${customEmphasis.trim()}.`);
      }
    } else {
      const chip = TAILORING_CHIPS.find((c) => c.key === key);
      if (chip?.text) parts.push(chip.text);
    }
  });
  if (additional.trim()) parts.push(additional.trim());
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

export interface TailoringState {
  chips: Set<string>;
  additional: string;
  customEmphasis: string;
}

/**
 * Restore tailoring state from localStorage.
 * Handles staged migration from old tm_instructions key.
 * Returns the restored state and whether migration was just triggered.
 */
export function restoreTailoring(): TailoringState & {
  migrationTriggered: boolean;
} {
  const migrated = lsGet<boolean>(GLOBAL_KEYS.tailoringMigrated);
  const oldInstructions = lsGet<string>(GLOBAL_KEYS.instructions);

  if (!migrated && oldInstructions) {
    // First load after migration: copy old key to additionalText
    lsSet(GLOBAL_KEYS.additionalText, oldInstructions);
    lsSet(GLOBAL_KEYS.tailoringMigrated, true);
    return {
      chips: new Set<string>(),
      additional: oldInstructions,
      customEmphasis: "",
      migrationTriggered: true,
    };
  }

  const savedChips = lsGet<string[]>(GLOBAL_KEYS.chipSelections);
  return {
    chips: savedChips ? new Set(savedChips) : new Set<string>(),
    additional: lsGet<string>(GLOBAL_KEYS.additionalText) ?? "",
    customEmphasis: lsGet<string>(GLOBAL_KEYS.customEmphasis) ?? "",
    migrationTriggered: false,
  };
}

/**
 * Persist current tailoring state to localStorage.
 */
export function saveTailoring(state: TailoringState): void {
  lsSet(GLOBAL_KEYS.chipSelections, Array.from(state.chips));
  lsSet(GLOBAL_KEYS.additionalText, state.additional);
  lsSet(GLOBAL_KEYS.customEmphasis, state.customEmphasis);
}

/**
 * Clear all tailoring state from localStorage and return empty state.
 */
export function clearTailoring(): TailoringState {
  lsDel(GLOBAL_KEYS.chipSelections);
  lsDel(GLOBAL_KEYS.additionalText);
  lsDel(GLOBAL_KEYS.customEmphasis);
  return { chips: new Set<string>(), additional: "", customEmphasis: "" };
}

/**
 * Complete staged migration: remove old tm_instructions key.
 * Call this after first successful generation post-migration.
 */
export function completeTailoringMigration(): void {
  const migrated = lsGet<boolean>(GLOBAL_KEYS.tailoringMigrated);
  if (migrated) {
    lsDel(GLOBAL_KEYS.instructions);
  }
}
