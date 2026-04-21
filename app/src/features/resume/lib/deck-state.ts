export type Coverage = 'covered' | 'partial' | 'missed';

export type CardSession = {
  at: string;
  view: string;
  coverage?: Coverage;
  duration_ms?: number;
};

export type CardProgress = {
  mastered?: boolean;
  flagged?: boolean;
  sessions?: CardSession[];
};

export type StudyState = 'all' | 'unmastered' | 'mastered' | 'flagged';

export type SavedViewColor = 'amber' | 'emerald' | 'blue' | 'slate';

export type SavedView = {
  id: string;
  name: string;
  filter: {
    category?: string;
    studyState?: StudyState;
    limit?: number;
  };
  isEnvelope: boolean;
  color: SavedViewColor;
  createdAt: string;
  userCreated: boolean;
};

export type DeckScopeState = {
  progress: Record<string, CardProgress>;
  savedViews: SavedView[];
  lastSessionAt?: string;
  cursorByView?: Record<string, number>;
  returnToastDismissedAt?: string;
};

export type DeckProgressEvent = CustomEvent<{ storageKey: string }>;

const NAMESPACE = 'resume-webapp-state-v2';
export const DECK_PROGRESS_EVENT = 'deck-progress';

const SESSION_HISTORY_CAP = 20;

export function deckStorageKey(storageKey: string): string {
  return `${NAMESPACE}:${storageKey}`;
}

function emptyState(): DeckScopeState {
  return { progress: {}, savedViews: [] };
}

export function loadDeckState(storageKey: string): DeckScopeState {
  if (typeof window === 'undefined') return emptyState();
  try {
    const raw = window.localStorage.getItem(deckStorageKey(storageKey));
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyState();
    return {
      progress: parsed.progress ?? {},
      savedViews: Array.isArray(parsed.savedViews) ? parsed.savedViews : [],
      lastSessionAt: parsed.lastSessionAt,
      cursorByView: parsed.cursorByView,
      returnToastDismissedAt: parsed.returnToastDismissedAt,
    };
  } catch {
    return emptyState();
  }
}

export function saveDeckState(storageKey: string, state: DeckScopeState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      deckStorageKey(storageKey),
      JSON.stringify(state),
    );
    window.dispatchEvent(
      new CustomEvent(DECK_PROGRESS_EVENT, { detail: { storageKey } }),
    );
  } catch {
    /* storage full/disabled — non-fatal */
  }
}

export function updateDeckState(
  storageKey: string,
  mutate: (current: DeckScopeState) => DeckScopeState,
): DeckScopeState {
  const current = loadDeckState(storageKey);
  const next = mutate(current);
  saveDeckState(storageKey, next);
  return next;
}

export function summarizeProgress(state: DeckScopeState): {
  mastered: number;
  flagged: number;
} {
  let mastered = 0;
  let flagged = 0;
  for (const entry of Object.values(state.progress)) {
    if (entry?.mastered) mastered += 1;
    if (entry?.flagged) flagged += 1;
  }
  return { mastered, flagged };
}

export function appendSession(
  card: CardProgress | undefined,
  session: CardSession,
): CardProgress {
  const prior = card?.sessions ?? [];
  const next = [...prior, session];
  if (next.length > SESSION_HISTORY_CAP) {
    next.splice(0, next.length - SESSION_HISTORY_CAP);
  }
  return { ...(card ?? {}), sessions: next };
}

export function importV1Progress(storageKey: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const legacyRaw = window.localStorage.getItem(`deck-${storageKey}`);
    if (!legacyRaw) return 0;
    const legacy = JSON.parse(legacyRaw) as Record<
      string,
      { mastered?: boolean; flagged?: boolean }
    >;
    if (!legacy || typeof legacy !== 'object') return 0;
    let imported = 0;
    updateDeckState(storageKey, (current) => {
      const progress: Record<string, CardProgress> = { ...current.progress };
      for (const [id, entry] of Object.entries(legacy)) {
        if (!entry || (!entry.mastered && !entry.flagged)) continue;
        const existing = progress[id] ?? {};
        progress[id] = {
          ...existing,
          mastered: existing.mastered ?? entry.mastered,
          flagged: existing.flagged ?? entry.flagged,
        };
        imported += 1;
      }
      return { ...current, progress };
    });
    return imported;
  } catch {
    return 0;
  }
}

export function resetDeckProgress(storageKey: string): void {
  updateDeckState(storageKey, (current) => ({
    ...current,
    progress: {},
  }));
}

export const DEFAULT_VIEWS: SavedView[] = [
  {
    id: 'todays-warmup',
    name: "Today's warmup",
    filter: { studyState: 'flagged', limit: 5 },
    isEnvelope: true,
    color: 'amber',
    createdAt: '1970-01-01T00:00:00Z',
    userCreated: false,
  },
  {
    id: 'sprint',
    name: 'Sprint',
    filter: { studyState: 'unmastered', limit: 25 },
    isEnvelope: false,
    color: 'blue',
    createdAt: '1970-01-01T00:00:00Z',
    userCreated: false,
  },
  {
    id: 'all-unmastered',
    name: 'All unmastered',
    filter: { studyState: 'unmastered' },
    isEnvelope: false,
    color: 'emerald',
    createdAt: '1970-01-01T00:00:00Z',
    userCreated: false,
  },
  {
    id: 'all',
    name: 'All',
    filter: { studyState: 'all' },
    isEnvelope: false,
    color: 'slate',
    createdAt: '1970-01-01T00:00:00Z',
    userCreated: false,
  },
];

export function ensureDefaultViews(storageKey: string): SavedView[] {
  const current = loadDeckState(storageKey);
  if (current.savedViews.length > 0) return current.savedViews;
  saveDeckState(storageKey, { ...current, savedViews: DEFAULT_VIEWS });
  return DEFAULT_VIEWS;
}

export function addSavedView(storageKey: string, view: SavedView): void {
  updateDeckState(storageKey, (current) => {
    const base =
      current.savedViews.length > 0 ? current.savedViews : DEFAULT_VIEWS;
    return { ...current, savedViews: [...base, view] };
  });
}

export function removeSavedView(storageKey: string, viewId: string): void {
  updateDeckState(storageKey, (current) => ({
    ...current,
    savedViews: current.savedViews.filter(
      (v) => v.id !== viewId || !v.userCreated,
    ),
  }));
}

export function setCursorForView(
  storageKey: string,
  viewId: string,
  cursor: number,
): void {
  updateDeckState(storageKey, (current) => ({
    ...current,
    cursorByView: { ...(current.cursorByView ?? {}), [viewId]: cursor },
  }));
}

type WithId = { id: string; category?: string };

export function applyViewFilter<T extends WithId>(
  entries: T[],
  state: DeckScopeState,
  view: SavedView,
): T[] {
  let result = entries;

  if (view.id === 'todays-warmup') {
    const flagged = result.filter((e) => state.progress[e.id]?.flagged);
    const unmastered = result.filter(
      (e) =>
        !state.progress[e.id]?.flagged && !state.progress[e.id]?.mastered,
    );
    result = [...flagged, ...unmastered];
  } else if (view.filter.studyState === 'flagged') {
    result = result.filter((e) => state.progress[e.id]?.flagged);
  } else if (view.filter.studyState === 'unmastered') {
    result = result.filter((e) => !state.progress[e.id]?.mastered);
  } else if (view.filter.studyState === 'mastered') {
    result = result.filter((e) => state.progress[e.id]?.mastered);
  }

  if (view.filter.category) {
    result = result.filter((e) => e.category === view.filter.category);
  }

  if (view.filter.limit !== undefined) {
    result = result.slice(0, view.filter.limit);
  }

  return result;
}
