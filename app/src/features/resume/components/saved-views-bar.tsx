import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { SavedView, SavedViewColor } from '@/features/resume/lib/deck-state';
import { cn } from '@/lib/utils';

type SavedViewsBarProps = {
  views: SavedView[];
  activeViewId: string;
  onSelect: (viewId: string) => void;
  onCreate?: () => void;
  counts: Record<string, number>;
};

const COLOR_ACTIVE: Record<SavedViewColor, string> = {
  amber:
    'border-warning bg-warning/15 text-warning dark:bg-warning/20',
  emerald:
    'border-success bg-success/15 text-success dark:bg-success/20',
  blue: 'border-info bg-info/15 text-info dark:bg-info/20',
  slate:
    'border-foreground/40 bg-muted text-foreground',
};

const COLOR_DOT: Record<SavedViewColor, string> = {
  amber: 'text-warning',
  emerald: 'text-success',
  blue: 'text-info',
  slate: 'text-muted-foreground',
};

export function SavedViewsBar({
  views,
  activeViewId,
  onSelect,
  onCreate,
  counts,
}: SavedViewsBarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="tablist"
      aria-label="保存済みビュー"
    >
      {views.map((view) => {
        const active = view.id === activeViewId;
        const total = counts[view.id] ?? 0;
        const capped =
          view.filter.limit !== undefined && total > view.filter.limit
            ? view.filter.limit
            : total;
        return (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(view.id)}
            className={cn(
              'inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              active
                ? COLOR_ACTIVE[view.color]
                : 'border-border bg-background text-foreground/70 hover:text-foreground hover:border-foreground/30',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'font-mono text-xs',
                active ? COLOR_DOT[view.color] : 'text-muted-foreground',
              )}
            >
              {active ? '●' : '○'}
            </span>
            <span>{view.name}</span>
            <span
              className={cn(
                'font-mono text-[11px] tabular-nums',
                active ? 'opacity-90' : 'text-muted-foreground',
              )}
              aria-label={`${capped} / ${total} 問`}
            >
              {capped}
              {view.filter.limit !== undefined && total > view.filter.limit ? (
                <span className="opacity-60">/{total}</span>
              ) : null}
              Q
            </span>
            {view.isEnvelope ? (
              <span
                className={cn(
                  'rounded-sm px-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]',
                  active
                    ? 'bg-background/60 text-foreground/80'
                    : 'bg-muted text-muted-foreground',
                )}
                title="セッションエンベロープモード: 60秒カウントダウン + 自己評価"
              >
                env
              </span>
            ) : null}
          </button>
        );
      })}
      {onCreate ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCreate}
          className="rounded-full font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          <Plus />
          New view
        </Button>
      ) : null}
    </div>
  );
}
