import { Download, Trash2 } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { importV1Progress } from '@/features/resume/lib/deck-state';
import { cn } from '@/lib/utils';

type ResetDialogProps = {
  storageKey: string;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onConfirm: () => void;
  onImported?: (count: number) => void;
};

const HOLD_MS = 2000;
const DOUBLE_TAP_WINDOW_MS = 3000;

export function ResetDialog({
  storageKey,
  open,
  onOpenChange,
  onConfirm,
  onImported,
}: ResetDialogProps) {
  const reducedMotion = useReducedMotion();
  const [holdPct, setHoldPct] = useState(0);
  const [armed, setArmed] = useState(false);
  const holdTimer = useRef<number | null>(null);
  const armTimer = useRef<number | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const clearTimers = useCallback(() => {
    if (holdTimer.current) {
      window.cancelAnimationFrame(holdTimer.current);
      holdTimer.current = null;
    }
    if (armTimer.current) {
      window.clearTimeout(armTimer.current);
      armTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setHoldPct(0);
      setArmed(false);
      setImportMessage(null);
      clearTimers();
    }
  }, [open, clearTimers]);

  const startHold = useCallback(() => {
    if (reducedMotion) return;
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      const pct = Math.min(1, elapsed / HOLD_MS);
      setHoldPct(pct);
      if (pct >= 1) {
        clearTimers();
        onConfirm();
        onOpenChange(false);
        return;
      }
      holdTimer.current = window.requestAnimationFrame(tick);
    };
    holdTimer.current = window.requestAnimationFrame(tick);
  }, [reducedMotion, onConfirm, onOpenChange, clearTimers]);

  const endHold = useCallback(() => {
    if (reducedMotion) return;
    clearTimers();
    setHoldPct(0);
  }, [reducedMotion, clearTimers]);

  const handleTapConfirm = useCallback(() => {
    if (!reducedMotion) return;
    if (armed) {
      clearTimers();
      setArmed(false);
      onConfirm();
      onOpenChange(false);
    } else {
      setArmed(true);
      armTimer.current = window.setTimeout(() => {
        setArmed(false);
      }, DOUBLE_TAP_WINDOW_MS);
    }
  }, [reducedMotion, armed, onConfirm, onOpenChange, clearTimers]);

  const handleImport = useCallback(() => {
    const count = importV1Progress(storageKey);
    if (count > 0) {
      setImportMessage(`${count} 問の進捗を旧形式から取り込みました。`);
      onImported?.(count);
    } else {
      setImportMessage('旧形式の進捗が見つかりませんでした。');
    }
  }, [storageKey, onImported]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[460px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 text-destructive" />
            デッキ進捗をリセット?
          </AlertDialogTitle>
          <AlertDialogDescription>
            このデッキの mastered / flagged 状態をすべて消去します。Saved views
            やテーマ設定は残ります。この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-3 py-2">
          {reducedMotion ? (
            <Button
              variant="destructive"
              onClick={handleTapConfirm}
              className={cn('w-full', armed && 'animate-pulse')}
            >
              {armed ? 'もう一度タップして確定' : '確定 (2 回タップ)'}
            </Button>
          ) : (
            <div className="relative">
              <button
                type="button"
                onPointerDown={startHold}
                onPointerUp={endHold}
                onPointerLeave={endHold}
                onPointerCancel={endHold}
                className="relative w-full select-none overflow-hidden rounded-md border border-destructive/50 bg-destructive/30 px-4 py-2 text-sm font-semibold text-destructive transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="2秒長押しで確定"
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 bg-destructive"
                  style={{
                    width: `${holdPct * 100}%`,
                    transition: holdPct === 0 ? 'width 0.2s ease-out' : 'none',
                  }}
                />
                <span className="relative z-10 mix-blend-difference">
                  {holdPct === 0
                    ? '2 秒長押しで確定'
                    : holdPct < 1
                      ? `確定まで ${(1 - holdPct).toFixed(1)}s`
                      : '確定'}
                </span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="outline"
            onClick={handleImport}
            className="w-full gap-2"
          >
            <Download className="size-4" />
            旧形式の進捗を取り込む
          </Button>

          {importMessage ? (
            <p className="text-center text-xs text-muted-foreground">
              {importMessage}
            </p>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
