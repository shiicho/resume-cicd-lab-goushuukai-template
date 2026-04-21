import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { loadDeckState, updateDeckState } from './deck-state';

const TWO_DAYS_MS = 48 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function humanizeGap(ms: number): string {
  const days = Math.floor(ms / ONE_DAY_MS);
  if (days >= 30) return `${Math.floor(days / 30)}ヶ月`;
  if (days >= 7) return `${Math.floor(days / 7)}週間`;
  return `${days}日`;
}

/**
 * Shows a one-off welcome-back toast when the user returns after a >48h
 * break AND hasn't dismissed it in the last 24h. Clicking the action
 * navigates to /interview-prep where "Today's warmup" is pre-selected.
 * Dismiss records returnToastDismissedAt to suppress re-prompts.
 */
export function useReturnAfterBreakToast(storageKey: string) {
  const navigate = useNavigate();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    const state = loadDeckState(storageKey);
    if (!state.lastSessionAt) return;

    const now = Date.now();
    const gap = now - new Date(state.lastSessionAt).getTime();
    if (gap < TWO_DAYS_MS) return;

    const dismissedAt = state.returnToastDismissedAt
      ? new Date(state.returnToastDismissedAt).getTime()
      : 0;
    if (now - dismissedAt < ONE_DAY_MS) return;

    shown.current = true;
    const gapLabel = humanizeGap(gap);

    toast(`${gapLabel}ぶりのドリル。`, {
      description: 'フラグ済みの 5 問で warmup を再開しませんか?',
      duration: 12_000,
      action: {
        label: 'Start warmup',
        onClick: () => {
          navigate('/interview-prep');
        },
      },
      onDismiss: () => {
        updateDeckState(storageKey, (current) => ({
          ...current,
          returnToastDismissedAt: new Date().toISOString(),
        }));
      },
      onAutoClose: () => {
        updateDeckState(storageKey, (current) => ({
          ...current,
          returnToastDismissedAt: new Date().toISOString(),
        }));
      },
    });
  }, [storageKey, navigate]);
}
