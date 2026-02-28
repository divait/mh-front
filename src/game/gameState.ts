export const DAY_DURATION_MS = 120_000; // 2 real minutes per in-game day
export const MAX_ARREST_ATTEMPTS = 3;

export type TimeOfDay = "dawn" | "morning" | "afternoon" | "dusk" | "night";

export type GamePhase = "playing" | "won" | "lost_time" | "lost_attempts";

export type LoseReason = "time" | "attempts";

/**
 * Maps a 0..1 progress value within a day to a time-of-day phase and
 * a 0..1 sub-progress within that phase.
 *
 * Day is divided into 5 equal segments:
 *   0.00 – 0.20  dawn
 *   0.20 – 0.40  morning
 *   0.40 – 0.60  afternoon
 *   0.60 – 0.80  dusk
 *   0.80 – 1.00  night
 */
export function getTimeOfDay(dayProgress: number): TimeOfDay {
  if (dayProgress < 0.2) return "dawn";
  if (dayProgress < 0.4) return "morning";
  if (dayProgress < 0.6) return "afternoon";
  if (dayProgress < 0.8) return "dusk";
  return "night";
}

/** Returns a 0..1 progress within the current time-of-day phase. */
export function getPhaseProgress(dayProgress: number): number {
  const segment = 0.2;
  const phaseStart = Math.floor(dayProgress / segment) * segment;
  return Math.min((dayProgress - phaseStart) / segment, 1);
}

/**
 * Returns the Phaser overlay color (hex number) and target alpha for the
 * given time-of-day phase and phase progress (0..1).
 *
 * Rules:
 *  - dawn:      subtle blue tint fading out as the sun rises
 *  - morning / afternoon / dusk: no overlay — full daylight
 *  - night:     dark blue overlay (moody atmosphere)
 *
 * A separate red warning overlay is handled in App.tsx for the last
 * 60 seconds of the very last day (see getDangerOverlay).
 */
export function getDayNightOverlay(
  phase: TimeOfDay,
  phaseProgress: number
): { color: number; alpha: number } {
  switch (phase) {
    case "dawn":
      return { color: 0x4466aa, alpha: 0.25 * (1 - phaseProgress) };
    case "morning":
    case "afternoon":
    case "dusk":
      return { color: 0x000000, alpha: 0 };
    case "night":
      return { color: 0x112244, alpha: 0.3 + 0.2 * phaseProgress };
  }
}

/**
 * Returns a red danger overlay when the player is in the last 60 seconds
 * of the very last day. Alpha pulses from 0 to 0.18 based on remaining time.
 * Returns null when no danger overlay should be shown.
 */
export function getDangerOverlay(
  currentDay: number,
  totalDays: number,
  dayTimeLeftSec: number
): { color: number; alpha: number } | null {
  const DANGER_THRESHOLD_SEC = 60;
  if (currentDay < totalDays) return null;
  if (dayTimeLeftSec > DANGER_THRESHOLD_SEC) return null;
  // Ramp from 0 → 0.18 as time runs out
  const t = 1 - dayTimeLeftSec / DANGER_THRESHOLD_SEC;
  return { color: 0xaa1111, alpha: 0.06 + 0.12 * t };
}

export const TIME_OF_DAY_ICONS: Record<TimeOfDay, string> = {
  dawn: "🌅",
  morning: "☀️",
  afternoon: "🌤️",
  dusk: "🌇",
  night: "🌙",
};

/**
 * Computes the number of in-game days from the number of quest clues.
 * Formula: ceil(clueCount / 2), minimum 1 day.
 */
export function computeTotalDays(clueCount: number): number {
  return Math.max(1, Math.ceil(clueCount / 2));
}
