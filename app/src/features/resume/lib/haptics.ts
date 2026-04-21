export type HapticKind =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error';

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 8,
  medium: 16,
  heavy: 32,
  success: [12, 40, 12],
  warning: [8, 60, 8],
  error: [24, 40, 24, 40, 24],
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Fire a vibration pattern keyed by semantic intent. No-op on desktop
 * (navigator.vibrate undefined) and under reduced-motion preference.
 * Throws-safe — some embed contexts deny vibration silently.
 */
export function fireHaptic(kind: HapticKind): void {
  if (typeof window === 'undefined') return;
  const nav = window.navigator;
  if (!nav || typeof nav.vibrate !== 'function') return;
  if (prefersReducedMotion()) return;
  try {
    nav.vibrate(PATTERNS[kind]);
  } catch {
    /* cross-origin iframe or policy-blocked — silent */
  }
}
