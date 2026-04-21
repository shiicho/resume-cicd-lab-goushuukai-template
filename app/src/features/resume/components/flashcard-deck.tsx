import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AttestationPip } from '@/components/provenance/attestation-pip';
import { TerminalBlock, isTerminalAnswer } from '@/components/signatures/terminal-block';
import { BorderBeam } from '@/components/ui/border-beam';
import { DeckCompleteDialog } from '@/features/resume/components/deck-complete-dialog';
import { EnvelopeSession } from '@/features/resume/components/envelope-session';
import { ResetDialog } from '@/features/resume/components/reset-dialog';
import { SessionPreCard } from '@/features/resume/components/session-pre-card';
import type { QaAttestation } from '@/features/resume/data/general-qa';
import {
  applyViewFilter,
  loadDeckState,
  resetDeckProgress,
  updateDeckState,
  type CardProgress,
  type SavedView,
} from '@/features/resume/lib/deck-state';
import { fireHaptic } from '@/features/resume/lib/haptics';
import { useCardGestures } from '@/features/resume/lib/use-card-gestures';
import { cn } from '@/lib/utils';

const SKIP_COUNTDOWN_KEY = 'resume-skip-countdown';

function loadSkipCountdown(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SKIP_COUNTDOWN_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveSkipCountdown(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SKIP_COUNTDOWN_KEY, String(value));
  } catch {
    /* non-fatal */
  }
}

/**
 * Flashcard deck for interview prep.
 *
 * A single card exposes a question. The student either attempts an answer
 * aloud, then clicks "Show reference answer" to compare. Each card can be
 * marked mastered (check) or flagged for review (flag) — those bits are
 * persisted to localStorage under `deck-${storageKey}`, per-card.
 *
 * Filters (category + sub-category), shuffle, and a mastered-only /
 * unmastered-only view let the student drill down on what they need.
 */

export interface FlashcardEntry {
  id: string;
  question: string;
  answer: string;
  category?: string;
  subCategory?: string;
  hint?: string;
  attestation?: QaAttestation;
}

interface FlashcardDeckProps {
  entries: FlashcardEntry[];
  storageKey: string;
  title: string;
  description?: string;
  eyebrow?: string;
  emptyMessage?: string;
  activeView?: SavedView;
}

type ProgressMap = Record<string, CardProgress>;

type StudyFilter = 'all' | 'unmastered' | 'mastered' | 'flagged';

function loadProgress(storageKey: string): ProgressMap {
  return loadDeckState(storageKey).progress;
}

function persistProgress(storageKey: string, progress: ProgressMap) {
  updateDeckState(storageKey, (current) => ({ ...current, progress }));
}

function shuffleIndices(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function countBy<T, K extends string>(items: T[], fn: (item: T) => K | undefined) {
  const out: Record<string, number> = {};
  for (const item of items) {
    const key = fn(item);
    if (!key) continue;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

export function FlashcardDeck({
  entries,
  storageKey,
  title,
  description,
  eyebrow = 'Q&A Flashcards',
  emptyMessage = 'No questions for this selection.',
  activeView,
}: FlashcardDeckProps) {
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress(storageKey));
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [studyFilter, setStudyFilter] = useState<StudyFilter>('all');
  const [revealed, setRevealed] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [skipCountdown, setSkipCountdownState] = useState(() =>
    loadSkipCountdown(),
  );

  const setSkipCountdown = useCallback((next: boolean) => {
    setSkipCountdownState(next);
    saveSkipCountdown(next);
  }, []);

  useEffect(() => {
    persistProgress(storageKey, progress);
  }, [progress, storageKey]);

  // Reset deck state when the source changes (e.g., navigating between projects).
  useEffect(() => {
    setCursor(0);
    setRevealed(false);
    setShuffled(false);
    setCategoryFilter(null);
    setStudyFilter('all');
    setSessionStarted(false);
  }, [storageKey]);

  // Reset session when the active view changes.
  useEffect(() => {
    setSessionStarted(false);
    setCursor(0);
    setRevealed(false);
  }, [activeView?.id]);

  const categories = useMemo(() => {
    const counts = countBy(entries, (e) => e.category);
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const filtered = useMemo(() => {
    if (activeView) {
      return applyViewFilter(entries, { progress, savedViews: [] }, activeView);
    }
    return entries.filter((entry) => {
      if (categoryFilter && entry.category !== categoryFilter) return false;
      const state = progress[entry.id] ?? {};
      if (studyFilter === 'unmastered' && state.mastered) return false;
      if (studyFilter === 'mastered' && !state.mastered) return false;
      if (studyFilter === 'flagged' && !state.flagged) return false;
      return true;
    });
  }, [entries, categoryFilter, studyFilter, progress, activeView]);

  const order = useMemo(() => {
    if (filtered.length === 0) return [];
    if (!shuffled) return filtered.map((_, i) => i);
    return shuffleIndices(filtered.length);
  }, [filtered, shuffled]);

  // Clamp the cursor if filters reduced the deck below the current index.
  useEffect(() => {
    if (order.length === 0) {
      setCursor(0);
      setRevealed(false);
      return;
    }
    if (cursor >= order.length) {
      setCursor(0);
      setRevealed(false);
    }
  }, [order.length, cursor]);

  const currentIndex = order.length > 0 ? order[Math.min(cursor, order.length - 1)] : -1;
  const current = currentIndex >= 0 ? filtered[currentIndex] : null;
  const currentState = current ? progress[current.id] ?? {} : {};

  const masteredCount = useMemo(
    () => entries.reduce((acc, entry) => acc + (progress[entry.id]?.mastered ? 1 : 0), 0),
    [entries, progress],
  );
  const flaggedCount = useMemo(
    () => entries.reduce((acc, entry) => acc + (progress[entry.id]?.flagged ? 1 : 0), 0),
    [entries, progress],
  );

  const goPrev = useCallback(() => {
    if (order.length === 0) return;
    setCursor((c) => (c - 1 + order.length) % order.length);
    setRevealed(false);
  }, [order.length]);

  const goNext = useCallback(() => {
    if (order.length === 0) return;
    setCursor((c) => (c + 1) % order.length);
    setRevealed(false);
  }, [order.length]);

  const toggleReveal = useCallback(() => {
    setRevealed((r) => !r);
  }, []);

  const [celebrating, setCelebrating] = useState(false);
  const celebrateTimer = useRef<number | null>(null);

  const celebrate = useCallback(() => {
    if (celebrateTimer.current) window.clearTimeout(celebrateTimer.current);
    setCelebrating(true);
    celebrateTimer.current = window.setTimeout(() => {
      setCelebrating(false);
      celebrateTimer.current = null;
    }, 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (celebrateTimer.current) window.clearTimeout(celebrateTimer.current);
    };
  }, []);

  const toggleMastered = useCallback(() => {
    if (!current) return;
    setProgress((prev) => {
      const state = { ...(prev[current.id] ?? {}) };
      const becoming = !state.mastered;
      state.mastered = becoming;
      if (becoming) {
        fireHaptic('medium');
        celebrate();
      }
      return { ...prev, [current.id]: state };
    });
  }, [current, celebrate]);

  const toggleFlagged = useCallback(() => {
    if (!current) return;
    setProgress((prev) => {
      const state = { ...(prev[current.id] ?? {}) };
      state.flagged = !state.flagged;
      return { ...prev, [current.id]: state };
    });
  }, [current]);

  const [resetOpen, setResetOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const seenCompleteRef = useRef(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useCardGestures(cardRef, {
    onSwipe: (direction) => {
      if (direction === 'up') goNext();
      else if (direction === 'down') goPrev();
      else if (direction === 'right') {
        toggleMastered();
      } else if (direction === 'left') {
        toggleFlagged();
        fireHaptic('light');
      }
    },
    onLongPress: () => {
      toggleReveal();
    },
    onLongPressStart: () => {
      fireHaptic('light');
    },
  });

  const performReset = useCallback(() => {
    resetDeckProgress(storageKey);
    setProgress({});
    setCategoryFilter(null);
    setStudyFilter('all');
    setCursor(0);
    setRevealed(false);
    setShuffled(false);
  }, [storageKey]);

  const handleImported = useCallback(() => {
    setProgress(loadProgress(storageKey));
  }, [storageKey]);

  // Keyboard: ←/→ navigate, Space / Enter reveal, K mastered, F flag.
  const envelopeActive = Boolean(activeView?.isEnvelope && sessionStarted);

  useEffect(() => {
    if (envelopeActive) return; // EnvelopeSession owns keys during envelope mode
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        toggleReveal();
      } else if (event.key === 'k' || event.key === 'K') {
        event.preventDefault();
        toggleMastered();
      } else if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        toggleFlagged();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [envelopeActive, goPrev, goNext, toggleReveal, toggleMastered, toggleFlagged]);

  const total = entries.length;
  const progressPct = total > 0 ? Math.round((masteredCount / total) * 100) : 0;

  // Reset completion guard when the deck changes so reopening a previously
  // completed deck can still celebrate if the user unmasters + remasters.
  useEffect(() => {
    seenCompleteRef.current = total > 0 && masteredCount === total;
  }, [storageKey]);

  useEffect(() => {
    if (envelopeActive) return;
    if (total === 0) return;
    if (masteredCount === total && !seenCompleteRef.current) {
      seenCompleteRef.current = true;
      setCompleteOpen(true);
    } else if (masteredCount < total) {
      seenCompleteRef.current = false;
    }
  }, [masteredCount, total, envelopeActive]);

  if (activeView?.isEnvelope && !sessionStarted) {
    return (
      <SessionPreCard
        view={activeView}
        queue={filtered}
        progress={progress}
        skipCountdown={skipCountdown}
        onSkipCountdownChange={setSkipCountdown}
        onStart={() => setSessionStarted(true)}
      />
    );
  }

  if (activeView?.isEnvelope && sessionStarted) {
    return (
      <EnvelopeSession
        view={activeView}
        queue={filtered}
        storageKey={storageKey}
        skipCountdown={skipCountdown}
        onComplete={() => {
          setSessionStarted(false);
          setProgress(loadProgress(storageKey));
        }}
        onCancel={() => {
          setSessionStarted(false);
          setProgress(loadProgress(storageKey));
        }}
      />
    );
  }

  return (
    <section className="rounded-[28px] border border bg-card/98 shadow-[0_16px_42px_rgba(15,23,42,0.07)]">
      <ResetDialog
        storageKey={storageKey}
        open={resetOpen}
        onOpenChange={setResetOpen}
        onConfirm={performReset}
        onImported={handleImported}
      />
      <DeckCompleteDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        deckLabel={title}
        total={total}
        badgeSlug={storageKey}
      />
      <header className="flex flex-col gap-4 border-b border-border p-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            {eyebrow}
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2 text-right text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-foreground/85">
              {masteredCount} / {total}
              <span className="ml-1 text-muted-foreground/70">mastered</span>
            </span>
            <span className="font-semibold text-warning">
              {flaggedCount}
              <span className="ml-1 text-muted-foreground/70">flagged</span>
            </span>
          </div>
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
            {progressPct}% complete
          </div>
        </div>
      </header>

      {!activeView ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3 text-sm">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            Category
          </span>
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition',
              categoryFilter === null
                ? 'border-primary bg-primary/10 text-primary'
                : 'border bg-card text-muted-foreground hover:border-border',
            )}
          >
            All ({entries.length})
          </button>
          {categories.map(([name, count]) => (
            <button
              key={name}
              type="button"
              onClick={() => setCategoryFilter(name)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition',
                categoryFilter === name
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border bg-card text-muted-foreground hover:border-border',
              )}
            >
              {name} ({count})
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3 text-sm">
        {!activeView ? (
          <>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              Study
            </span>
            {(
              [
                ['all', 'All cards'],
                ['unmastered', 'Unmastered'],
                ['mastered', 'Mastered'],
                ['flagged', 'Flagged'],
              ] as Array<[StudyFilter, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStudyFilter(value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition',
                  studyFilter === value
                    ? 'border-success bg-success/10 text-success'
                    : 'border bg-card text-muted-foreground hover:border-border',
                )}
              >
                {label}
              </button>
            ))}
            <div className="mx-1 h-4 w-px bg-muted" />
          </>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setShuffled((s) => !s);
            setCursor(0);
            setRevealed(false);
          }}
          className={cn(
            'rounded-full border px-3 py-1 text-xs transition',
            shuffled
              ? 'border-purple-500 bg-purple-50 text-purple-700'
              : 'border bg-card text-muted-foreground hover:border-border',
          )}
        >
          {shuffled ? 'Shuffled' : 'Shuffle'}
        </button>
        <button
          type="button"
          onClick={() => setResetOpen(true)}
          className="rounded-full border border bg-card px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Reset
        </button>
        <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground/70">
          <span>← →</span>
          <span>Space: flip</span>
          <span>K: mastered</span>
          <span>F: flag</span>
        </div>
      </div>

      {order.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground">{emptyMessage}</div>
      ) : (
        <div className="p-6">
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Card{' '}
              <strong className="text-foreground">{cursor + 1}</strong> of{' '}
              <strong className="text-foreground">{order.length}</strong>
              {filtered.length !== entries.length ? (
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  filtered from {entries.length}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {current && currentState.mastered ? (
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                  ✓ mastered
                </span>
              ) : null}
              {current && currentState.flagged ? (
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                  ⚑ flagged
                </span>
              ) : null}
            </div>
          </div>

          {current ? (
            <div
              ref={cardRef}
              className={cn(
                'relative overflow-hidden rounded-[24px] border-2 transition-all duration-300 touch-pan-y',
                revealed
                  ? 'border-success/50 bg-gradient-to-br from-emerald-50/80 via-white to-white'
                  : 'border-primary/40 bg-gradient-to-br from-blue-50/80 via-white to-white',
              )}
            >
              {celebrating ? (
                <BorderBeam
                  size={120}
                  duration={1.5}
                  borderWidth={2}
                  colorFrom="oklch(0.769 0.188 70.08)"
                  colorTo="oklch(0.596 0.145 163.225)"
                />
              ) : null}
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
                {current.category ? (
                  <span className="rounded-full bg-primary/10 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    {current.category}
                  </span>
                ) : null}
                {current.subCategory ? (
                  <span className="rounded-full bg-muted px-3 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {current.subCategory}
                  </span>
                ) : null}
                {current.hint ? (
                  <span className="ml-auto text-[11px] text-muted-foreground/70">{current.hint}</span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={toggleReveal}
                className="block w-full cursor-pointer select-text px-6 py-8 text-left"
                aria-expanded={revealed}
                aria-keyshortcuts="Space"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Question
                </div>
                <p
                  className="mt-3 whitespace-pre-wrap text-2xl font-semibold leading-relaxed text-foreground"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {current.question}
                </p>

                {revealed ? (
                  <div className="mt-6 rounded-[18px] border border-success/40 bg-white/90 p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-success">
                      Reference answer
                    </div>
                    {isTerminalAnswer(current.answer) ? (
                      <TerminalBlock content={current.answer} className="mt-3" />
                    ) : (
                      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-[1.9] text-foreground/85">
                        {current.answer}
                      </p>
                    )}
                    {current.attestation && (
                      <EvidenceStrip attestation={current.attestation} />
                    )}
                  </div>
                ) : (
                  <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-card px-4 py-2 text-sm font-semibold text-primary">
                    Show reference answer
                    <span className="text-xs text-muted-foreground/70">(Space)</span>
                  </div>
                )}
              </button>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                aria-keyshortcuts="ArrowLeft"
                className="rounded-full border border bg-card px-4 py-2 text-sm text-foreground/85 transition hover:border-border hover:bg-muted/40"
              >
                ← Previous
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-keyshortcuts="ArrowRight"
                className="rounded-full border border bg-card px-4 py-2 text-sm text-foreground/85 transition hover:border-border hover:bg-muted/40"
              >
                Next →
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFlagged}
                aria-keyshortcuts="F"
                aria-pressed={currentState.flagged}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm transition',
                  currentState.flagged
                    ? 'border-warning bg-warning/15 text-warning'
                    : 'border bg-card text-muted-foreground hover:border-border',
                )}
              >
                {currentState.flagged ? '⚑ Flagged — review' : 'Flag for review'}
              </button>
              <button
                type="button"
                onClick={toggleMastered}
                aria-keyshortcuts="K"
                aria-pressed={currentState.mastered}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm font-semibold transition',
                  currentState.mastered
                    ? 'border-success bg-success/100 text-white hover:bg-success/90'
                    : 'border-success/50 bg-success/10 text-success hover:border-success/60',
                )}
              >
                {currentState.mastered ? '✓ Mastered' : 'Mark mastered'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function EvidenceStrip({ attestation }: { attestation: QaAttestation }) {
  const attestedCopy =
    '職務経歴書 + 面接Q&A シートで裏取りできる回答です。';
  const imaginedCopy =
    '履歴書に直接の記載はなく、業界標準として補った回答です。';
  const tooltipLabel =
    attestation.kind === 'attested' ? attestedCopy : imaginedCopy;
  return (
    <div className="mt-4 flex items-center gap-2 border-t pt-3 font-mono text-[11px] text-muted-foreground">
      <AttestationPip
        kind={attestation.kind}
        size="sm"
        label={tooltipLabel}
      />
      <span className="uppercase tracking-[0.18em]">
        {attestation.kind === 'attested' ? 'Attested' : 'Imagined'}
      </span>
      <span className="text-muted-foreground/70">·</span>
      <span className="truncate normal-case tracking-normal">
        {attestation.source}
      </span>
    </div>
  );
}
