import { Check, CircleDot, PartyPopper, Play, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { TerminalBlock, isTerminalAnswer } from '@/components/signatures/terminal-block';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { FlashcardEntry } from '@/features/resume/components/flashcard-deck';
import {
  appendSession,
  updateDeckState,
  type Coverage,
  type SavedView,
} from '@/features/resume/lib/deck-state';
import { fireHaptic } from '@/features/resume/lib/haptics';
import { cn } from '@/lib/utils';

type CardPhase = 'pre' | 'speaking' | 'revealed' | 'recap';

export type ScoredCard = {
  id: string;
  coverage: Coverage;
  duration_ms: number;
};

export type SessionSummary = {
  startedAt: string;
  durationMs: number;
  scored: ScoredCard[];
  queueSize: number;
};

type EnvelopeSessionProps = {
  view: SavedView;
  queue: FlashcardEntry[];
  storageKey: string;
  skipCountdown: boolean;
  onComplete: (summary: SessionSummary) => void;
  onCancel: () => void;
};

const COUNTDOWN_SECONDS = 60;

export function EnvelopeSession({
  view,
  queue,
  storageKey,
  skipCountdown,
  onComplete,
  onCancel,
}: EnvelopeSessionProps) {
  const [cursor, setCursor] = useState(0);
  const [phase, setPhase] = useState<CardPhase>('pre');
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const [overrideQueue, setOverrideQueue] = useState<FlashcardEntry[] | null>(
    null,
  );
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const sessionStartedAtRef = useRef(Date.now());
  const cardStartedAt = useRef(Date.now());
  const scoredRef = useRef<ScoredCard[]>([]);

  const effectiveQueue = overrideQueue ?? queue;
  const current = effectiveQueue[cursor];
  const total = effectiveQueue.length;
  const progressPct =
    total > 0 ? ((cursor + (phase === 'revealed' ? 1 : 0)) / total) * 100 : 0;

  useEffect(() => {
    cardStartedAt.current = Date.now();
    setPhase('pre');
    setRemaining(COUNTDOWN_SECONDS);
  }, [cursor]);

  useEffect(() => {
    if (phase !== 'speaking') return;
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(id);
          setPhase('revealed');
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const score = useCallback(
    (coverage: Coverage) => {
      if (!current) return;
      fireHaptic(
        coverage === 'covered'
          ? 'success'
          : coverage === 'partial'
            ? 'warning'
            : 'error',
      );
      const duration_ms = Date.now() - cardStartedAt.current;
      const cardId = current.id;
      scoredRef.current.push({ id: cardId, coverage, duration_ms });

      updateDeckState(storageKey, (state) => {
        const prior = state.progress[cardId] ?? {};
        let next = appendSession(prior, {
          at: new Date().toISOString(),
          view: view.id,
          coverage,
          duration_ms,
        });
        if (coverage === 'missed' || coverage === 'partial') {
          next = { ...next, flagged: true };
        } else if (coverage === 'covered' && prior.flagged) {
          next = { ...next, flagged: false };
        }
        return {
          ...state,
          progress: { ...state.progress, [cardId]: next },
          lastSessionAt: new Date().toISOString(),
        };
      });

      if (cursor >= total - 1) {
        const sessionSummary: SessionSummary = {
          startedAt: new Date(sessionStartedAtRef.current).toISOString(),
          durationMs: Date.now() - sessionStartedAtRef.current,
          scored: [...scoredRef.current],
          queueSize: total,
        };
        setSummary(sessionSummary);
        setPhase('recap');
      } else {
        setCursor((c) => c + 1);
      }
    },
    [current, cursor, total, storageKey, view.id],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        if (phase === 'pre') {
          setPhase(skipCountdown ? 'revealed' : 'speaking');
        } else if (phase === 'speaking') {
          setPhase('revealed');
        }
        return;
      }

      if ((event.key === 's' || event.key === 'S') && phase === 'speaking') {
        event.preventDefault();
        setPhase('revealed');
        return;
      }

      if (phase === 'revealed') {
        if (event.key === 'c' || event.key === 'C') {
          event.preventDefault();
          score('covered');
        } else if (event.key === 'p' || event.key === 'P') {
          event.preventDefault();
          score('partial');
        } else if (event.key === 'x' || event.key === 'X') {
          event.preventDefault();
          score('missed');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, skipCountdown, score, onCancel]);

  const resetForReview = useCallback(() => {
    if (!summary) return;
    const missedIds = new Set(
      summary.scored
        .filter((s) => s.coverage !== 'covered')
        .map((s) => s.id),
    );
    const nextQueue = effectiveQueue.filter((c) => missedIds.has(c.id));
    if (nextQueue.length === 0) return;
    scoredRef.current = [];
    setOverrideQueue(nextQueue);
    setSummary(null);
    setCursor(0);
    setPhase('pre');
    sessionStartedAtRef.current = Date.now();
    cardStartedAt.current = Date.now();
  }, [summary, effectiveQueue]);

  const finishSession = useCallback(() => {
    if (summary) onComplete(summary);
    else onCancel();
  }, [summary, onComplete, onCancel]);

  if (phase === 'recap' && summary) {
    return <RecapCard view={view} summary={summary} onReview={resetForReview} onDone={finishSession} />;
  }

  if (!current) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        カードがありません。
      </Card>
    );
  }

  const countdownDanger = phase === 'speaking' && remaining <= 10;
  const countdownCritical = phase === 'speaking' && remaining <= 0;

  const borderByPhase =
    phase === 'revealed'
      ? 'border-success/50'
      : countdownDanger
        ? 'border-warning/60'
        : 'border-border';

  return (
    <Card className={cn('gap-5 p-7 transition-colors', borderByPhase)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {view.name}
          </div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            Card {cursor + 1} of {total}
          </div>
        </div>

        {phase === 'speaking' ? (
          <div
            className={cn(
              'font-mono text-3xl font-bold tabular-nums tracking-tight',
              countdownCritical
                ? 'text-destructive'
                : countdownDanger
                  ? 'text-warning'
                  : 'text-foreground',
            )}
            aria-live="polite"
          >
            {remaining}s
          </div>
        ) : null}

        {phase === 'pre' ? (
          <div className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
            Space to speak
          </div>
        ) : null}

        {phase === 'revealed' ? (
          <div className="rounded-full border border-success/40 bg-success/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-success">
            Rate yourself
          </div>
        ) : null}
      </div>

      <Progress value={progressPct} className="h-1" />

      {current.category ? (
        <span className="inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          {current.category}
        </span>
      ) : null}

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Question
        </div>
        <h3 className="mt-2 whitespace-pre-wrap text-2xl font-semibold leading-relaxed text-foreground">
          {current.question}
        </h3>
      </div>

      {phase === 'pre' ? (
        <p className="text-sm leading-6 text-muted-foreground">
          声に出して答えを述べてください。
          <kbd className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
            Space
          </kbd>
          {skipCountdown
            ? ' で即座に参照回答を表示します (カウントダウンは無効)。'
            : ' で 60 秒カウントダウンが始まります。'}
        </p>
      ) : null}

      {phase === 'speaking' ? (
        <p className="text-sm leading-6 text-muted-foreground">
          声に出して説明中…
          <kbd className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
            Space
          </kbd>
          <kbd className="mr-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
            S
          </kbd>
          で即座に参照回答を表示。
        </p>
      ) : null}

      {phase === 'revealed' ? (
        <div className="rounded-lg border bg-muted/30 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-success">
            Reference
          </div>
          {isTerminalAnswer(current.answer) ? (
            <TerminalBlock content={current.answer} className="mt-3" />
          ) : (
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-[1.9] text-foreground/90">
              {current.answer}
            </p>
          )}
        </div>
      ) : null}

      {phase === 'revealed' ? (
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            How did you do?
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => score('covered')}
              variant="outline"
              className="gap-2 border-success/40 text-success hover:bg-success/10 hover:text-success"
            >
              <Check />
              Covered
              <kbd className="ml-1 rounded-sm bg-muted px-1.5 font-mono text-[10px]">
                C
              </kbd>
            </Button>
            <Button
              onClick={() => score('partial')}
              variant="outline"
              className="gap-2 border-warning/40 hover:bg-warning/10"
            >
              <CircleDot />
              Partial
              <kbd className="ml-1 rounded-sm bg-muted px-1.5 font-mono text-[10px]">
                P
              </kbd>
            </Button>
            <Button
              onClick={() => score('missed')}
              variant="outline"
              className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <X />
              Missed
              <kbd className="ml-1 rounded-sm bg-muted px-1.5 font-mono text-[10px]">
                X
              </kbd>
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-4 text-[11px] text-muted-foreground">
        <button
          type="button"
          onClick={onCancel}
          className="underline-offset-2 hover:text-foreground hover:underline"
        >
          Esc: cancel session
        </button>
        {phase === 'revealed' ? (
          <span>missed / partial は自動で旗立て、covered は旗解除</span>
        ) : null}
      </div>
    </Card>
  );
}

type RecapCardProps = {
  view: SavedView;
  summary: SessionSummary;
  onReview: () => void;
  onDone: () => void;
};

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function RecapCard({ view, summary, onReview, onDone }: RecapCardProps) {
  const counts = useMemo(() => {
    let covered = 0;
    let partial = 0;
    let missed = 0;
    for (const s of summary.scored) {
      if (s.coverage === 'covered') covered += 1;
      else if (s.coverage === 'partial') partial += 1;
      else if (s.coverage === 'missed') missed += 1;
    }
    return { covered, partial, missed };
  }, [summary.scored]);

  const total = summary.queueSize;
  const autoFlagged = counts.partial + counts.missed;
  const needsReview = autoFlagged > 0;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault();
        onDone();
      } else if (
        (event.key === 'r' || event.key === 'R') &&
        needsReview
      ) {
        event.preventDefault();
        onReview();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [needsReview, onDone, onReview]);

  return (
    <Card className="gap-6 border-success/40 p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-success">
            <PartyPopper className="size-4" />
            Session complete
          </div>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {view.name}
          </h3>
        </div>
        <div className="font-mono text-lg tabular-nums text-foreground/80">
          {formatDuration(summary.durationMs)}
        </div>
      </div>

      <div className="grid gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Coverage
        </div>
        <RecapRow
          icon={<Check className="size-4 text-success" />}
          label="covered"
          value={counts.covered}
          total={total}
          tone="success"
        />
        <RecapRow
          icon={<CircleDot className="size-4 text-warning" />}
          label="partial"
          value={counts.partial}
          total={total}
          tone="warning"
        />
        <RecapRow
          icon={<X className="size-4 text-destructive" />}
          label="missed"
          value={counts.missed}
          total={total}
          tone="destructive"
        />
      </div>

      {autoFlagged > 0 ? (
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{autoFlagged}</span>{' '}
          {autoFlagged === 1 ? 'card' : 'cards'} auto-flagged (missed + partial).
          {view.id === 'todays-warmup'
            ? ' 明日の warmup に自動で入ります。'
            : ''}
        </div>
      ) : (
        <div className="rounded-md border bg-success/10 px-4 py-3 text-sm text-foreground/90">
          全カードを自信を持って回答できました。
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="outline"
          disabled={!needsReview}
          onClick={onReview}
          className="gap-2"
        >
          <Play />
          Review missed now
          {needsReview ? (
            <kbd className="ml-1 rounded-sm bg-muted px-1.5 font-mono text-[10px]">
              R
            </kbd>
          ) : null}
        </Button>
        <Button onClick={onDone} className="gap-2">
          Done
          <kbd className="ml-1 rounded-sm bg-primary-foreground/20 px-1.5 font-mono text-[10px]">
            Enter
          </kbd>
        </Button>
      </div>
    </Card>
  );
}

type RecapRowProps = {
  icon: React.ReactNode;
  label: string;
  value: number;
  total: number;
  tone: 'success' | 'warning' | 'destructive';
};

function RecapRow({ icon, label, value, total, tone }: RecapRowProps) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const fillColor =
    tone === 'success'
      ? 'bg-success'
      : tone === 'warning'
        ? 'bg-warning'
        : 'bg-destructive';
  return (
    <div className="grid grid-cols-[1.5rem_5rem_1fr_auto] items-center gap-3 text-sm">
      {icon}
      <span className="font-mono text-foreground/80">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', fillColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono tabular-nums text-foreground">
        {value} of {total}
      </span>
    </div>
  );
}
