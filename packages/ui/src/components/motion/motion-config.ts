/** Shared motion timings — keep enters short; avoid blocking UI on exits. */
export const MOTION_ENTER_S = 0.15;
export const MOTION_EXIT_S = 0.1;
export const MOTION_EASE = [0.16, 1, 0.3, 1] as const;

export const STAGGER_STEP_MS = 25;
export const STAGGER_MAX_MS = 100;
