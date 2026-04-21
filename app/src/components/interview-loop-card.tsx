import { Calendar, Pencil } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  loadDeckState,
  DECK_PROGRESS_EVENT,
  type DeckProgressEvent,
} from '@/features/resume/lib/deck-state';
import { useDeckProgress } from '@/features/resume/lib/use-deck-progress';
import { generalQaBank } from '@/features/resume/data/general-qa';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'resume-interview-loop';
const DECK_SCOPE = 'general-interview';

type InterviewLoop = {
  date: string;
  label: string;
};

function loadLoop(): InterviewLoop | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.date && typeof parsed.label === 'string') {
      return { date: parsed.date, label: parsed.label };
    }
  } catch {
    /* swallow */
  }
  return null;
}

function saveLoop(loop: InterviewLoop | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!loop) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loop));
  } catch {
    /* non-fatal */
  }
}

function daysBetween(target: Date, now: Date = new Date()): number {
  const startOfDay = (d: Date) =>
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const ms = startOfDay(target) - startOfDay(now);
  return Math.round(ms / 86_400_000);
}

function humanizeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diff = now.getTime() - then.getTime();
  if (diff < 60_000) return 'たった今';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}週間前`;
  return then.toLocaleDateString('ja-JP');
}

export function InterviewLoopCard({
  variant = 'sidebar',
}: {
  variant?: 'sidebar' | 'inline';
}) {
  const reducedMotion = useReducedMotion();
  const [loop, setLoopState] = useState<InterviewLoop | null>(() => loadLoop());
  const [editOpen, setEditOpen] = useState(false);
  const [lastSessionAt, setLastSessionAt] = useState<string | undefined>(
    () => loadDeckState(DECK_SCOPE).lastSessionAt,
  );
  const progress = useDeckProgress(DECK_SCOPE);
  const total = generalQaBank.length;

  useEffect(() => {
    setLastSessionAt(loadDeckState(DECK_SCOPE).lastSessionAt);
    const onCustom = (event: Event) => {
      const detail = (event as DeckProgressEvent).detail;
      if (!detail?.storageKey || detail.storageKey === DECK_SCOPE) {
        setLastSessionAt(loadDeckState(DECK_SCOPE).lastSessionAt);
      }
    };
    window.addEventListener(DECK_PROGRESS_EVENT, onCustom);
    return () => window.removeEventListener(DECK_PROGRESS_EVENT, onCustom);
  }, []);

  const setLoop = (next: InterviewLoop | null) => {
    saveLoop(next);
    setLoopState(next);
  };

  if (!loop) {
    return (
      <Card
        className={cn(
          'gap-2',
          variant === 'sidebar' ? 'p-4' : 'p-5',
        )}
      >
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-muted-foreground" />
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Interview Loop
          </div>
        </div>
        <p className="text-[13px] leading-6 text-muted-foreground">
          次の面接日を登録すると、カウントダウンと紐づけた drilling が始まります。
        </p>
        <EditLoopPopover
          open={editOpen}
          onOpenChange={setEditOpen}
          loop={null}
          onSave={setLoop}
          trigger={
            <Button variant="outline" size="sm" className="w-fit">
              <Pencil />
              Set date
            </Button>
          }
        />
      </Card>
    );
  }

  const target = new Date(loop.date);
  const days = daysBetween(target);
  const past = days < 0;
  const urgent = !past && days < 7;
  const critical = !past && days < 3;

  const numberColor = past
    ? 'text-muted-foreground'
    : critical
      ? 'text-destructive'
      : urgent
        ? 'text-warning'
        : 'text-primary';

  const number = past ? Math.abs(days) : days;
  const numberLabel = past ? '日経過' : days === 0 ? 'TODAY' : days === 1 ? 'day' : 'days';

  return (
    <Card
      className={cn(
        'gap-3',
        variant === 'sidebar' ? 'p-4' : 'p-5',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-muted-foreground" />
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Interview Loop
          </div>
        </div>
        <EditLoopPopover
          open={editOpen}
          onOpenChange={setEditOpen}
          loop={loop}
          onSave={setLoop}
          trigger={
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-foreground"
              aria-label="編集"
            >
              <Pencil />
            </Button>
          }
        />
      </div>

      <div className="flex items-baseline gap-2">
        {days === 0 ? (
          <span
            className={cn(
              'font-mono text-3xl font-semibold tracking-tight',
              numberColor,
              !reducedMotion && 'animate-pulse',
            )}
          >
            TODAY
          </span>
        ) : (
          <>
            <span
              className={cn(
                'font-mono text-5xl font-semibold leading-none tabular-nums tracking-tight',
                numberColor,
                !reducedMotion && critical && 'animate-pulse',
              )}
            >
              {number}
            </span>
            <span className="font-mono text-sm text-muted-foreground">
              {numberLabel}
            </span>
          </>
        )}
      </div>

      <div className="text-sm font-semibold text-foreground">{loop.label}</div>

      <div className="border-t pt-3 font-mono text-[12px] leading-6 text-muted-foreground">
        <div className="flex justify-between">
          <span>mastered</span>
          <span className="tabular-nums text-foreground/90">
            {progress.mastered} / {total}
          </span>
        </div>
        <div className="flex justify-between">
          <span>flagged</span>
          <span className="tabular-nums text-warning">
            {progress.flagged}
          </span>
        </div>
        <div className="flex justify-between">
          <span>last drill</span>
          <span className="text-foreground/80">
            {lastSessionAt ? humanizeAgo(lastSessionAt) : '未実施'}
          </span>
        </div>
      </div>

      {past ? (
        <p className="text-[11px] leading-5 text-muted-foreground">
          面接から {Math.abs(days)} 日経過。次のループを設定してください。
        </p>
      ) : null}
    </Card>
  );
}

type EditLoopPopoverProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  loop: InterviewLoop | null;
  onSave: (next: InterviewLoop | null) => void;
  trigger: React.ReactNode;
};

function EditLoopPopover({
  open,
  onOpenChange,
  loop,
  onSave,
  trigger,
}: EditLoopPopoverProps) {
  const [dateStr, setDateStr] = useState(loop?.date.slice(0, 10) ?? '');
  const [label, setLabel] = useState(loop?.label ?? '');

  useEffect(() => {
    if (open) {
      setDateStr(loop?.date.slice(0, 10) ?? '');
      setLabel(loop?.label ?? '');
    }
  }, [open, loop]);

  const handleSave = () => {
    if (!dateStr || !label.trim()) return;
    const iso = new Date(`${dateStr}T00:00:00`).toISOString();
    onSave({ date: iso, label: label.trim() });
    onOpenChange(false);
  };

  const handleClear = () => {
    onSave(null);
    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-[280px]">
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="loop-date">面接日</Label>
            <Input
              id="loop-date"
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="loop-label">ラベル</Label>
            <Input
              id="loop-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例: Rakuten SRE"
              maxLength={32}
            />
          </div>
          <div className="flex justify-between gap-2 pt-1">
            {loop ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={handleClear}
              >
                クリア
              </Button>
            ) : (
              <span />
            )}
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!dateStr || !label.trim()}
            >
              保存
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
