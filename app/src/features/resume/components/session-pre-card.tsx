import { Clock, Flag, Play } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type {
  CardProgress,
  SavedView,
} from '@/features/resume/lib/deck-state';

type QueueEntry = {
  id: string;
  question: string;
  category?: string;
  hint?: string;
};

type SessionPreCardProps = {
  view: SavedView;
  queue: QueueEntry[];
  progress: Record<string, CardProgress>;
  skipCountdown: boolean;
  onSkipCountdownChange: (next: boolean) => void;
  onStart: () => void;
};

const SECONDS_PER_CARD = 60 + 30; // countdown + reveal+answer

export function SessionPreCard({
  view,
  queue,
  progress,
  skipCountdown,
  onSkipCountdownChange,
  onStart,
}: SessionPreCardProps) {
  const count = queue.length;
  const estimatedSeconds = count * (skipCountdown ? 30 : SECONDS_PER_CARD);
  const estimatedMin = Math.max(1, Math.round(estimatedSeconds / 60));

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
      if (event.key === 'Enter' && count > 0) {
        event.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [count, onStart]);

  if (count === 0) {
    return (
      <Card className="gap-4 p-8 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {view.name}
        </div>
        <p className="text-foreground">
          このビューで該当するカードがまだありません。別のビューを選ぶか、カードに
          フラグを立ててから再開してください。
        </p>
      </Card>
    );
  }

  return (
    <Card className="gap-5 p-7">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Ready to drill
        </div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          {view.name}
        </h2>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {count} cards · ~{estimatedMin} min
        </p>
      </div>

      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Queue
        </div>
        <ol className="space-y-1.5 text-sm">
          {queue.map((entry, i) => {
            const flagged = progress[entry.id]?.flagged;
            return (
              <li
                key={entry.id}
                className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2"
              >
                <span className="min-w-[1.5rem] font-mono text-xs text-muted-foreground">
                  {i + 1}.
                </span>
                {entry.category ? (
                  <span className="shrink-0 font-mono text-[11px] text-primary">
                    {entry.category}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 line-clamp-2 text-foreground/90">
                  {entry.question}
                </span>
                {flagged ? (
                  <Flag
                    className="size-4 shrink-0 text-warning"
                    aria-label="flagged"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 text-[13px] leading-6 text-muted-foreground">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/70">
          Per-card rhythm
        </div>
        <ul className="mt-2 space-y-1">
          <li>
            <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              Space
            </kbd>{' '}
            → 60s speak-aloud countdown
          </li>
          <li>
            <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              Space
            </kbd>{' '}
            → reveal reference answer
          </li>
          <li>
            Tap{' '}
            <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              C / P / X
            </kbd>{' '}
            → covered · partial · missed
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch
            checked={skipCountdown}
            onCheckedChange={onSkipCountdownChange}
            aria-label="skip countdown"
          />
          <Clock className="size-4" />
          skip countdown
        </label>

        <Button onClick={onStart} size="lg" className="gap-2">
          <Play />
          Start
          <span className="ml-1 rounded-sm bg-primary-foreground/15 px-1.5 font-mono text-[11px]">
            Enter
          </span>
        </Button>
      </div>
    </Card>
  );
}
