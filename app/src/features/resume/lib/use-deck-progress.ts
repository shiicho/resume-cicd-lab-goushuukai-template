import { useEffect, useState } from 'react';

import {
  DECK_PROGRESS_EVENT,
  deckStorageKey,
  loadDeckState,
  summarizeProgress,
  type DeckProgressEvent,
} from './deck-state';

/**
 * Summarize the v2 deck state for a storage scope. Updates on
 * cross-tab storage writes (storage event) and same-tab dispatches
 * (deck-progress CustomEvent emitted by saveDeckState).
 */

export interface DeckProgressSummary {
  mastered: number;
  flagged: number;
}

function read(storageKey: string): DeckProgressSummary {
  return summarizeProgress(loadDeckState(storageKey));
}

export function useDeckProgress(storageKey: string): DeckProgressSummary {
  const [summary, setSummary] = useState<DeckProgressSummary>(() =>
    read(storageKey),
  );

  useEffect(() => {
    setSummary(read(storageKey));

    const nsKey = deckStorageKey(storageKey);
    const onStorage = (event: StorageEvent) => {
      if (event.key === nsKey) setSummary(read(storageKey));
    };
    const onCustom = (event: Event) => {
      const detail = (event as DeckProgressEvent).detail;
      if (!detail?.storageKey || detail.storageKey === storageKey) {
        setSummary(read(storageKey));
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(DECK_PROGRESS_EVENT, onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(DECK_PROGRESS_EVENT, onCustom);
    };
  }, [storageKey]);

  return summary;
}
