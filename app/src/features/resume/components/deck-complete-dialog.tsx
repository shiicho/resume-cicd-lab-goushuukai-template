import { ClipboardCheck, Copy, PartyPopper } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const STEAM_FRAMES = [
  `      )
     (
      )
     ( (
    ╭──┴──╮
    │  ☕ │
    ╰─────╯    `,
  `     )
      (
     )
    ( (
    ╭──┴──╮
    │  ☕ │
    ╰─────╯    `,
  `      )
     (
       )
     ( (
    ╭──┴──╮
    │  ☕ │
    ╰─────╯    `,
];

type DeckCompleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckLabel: string;
  total: number;
  badgeSlug: string;
};

function buildBadge(deckLabel: string, badgeSlug: string, total: number): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return [
    `shiicho · resume-cicd-lab · ${badgeSlug} mastered`,
    `${total}/${total} · finished ${stamp}`,
  ].join('\n');
}

export function DeckCompleteDialog({
  open,
  onOpenChange,
  deckLabel,
  total,
  badgeSlug,
}: DeckCompleteDialogProps) {
  const reducedMotion = useReducedMotion();
  const [frameIndex, setFrameIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || reducedMotion) return;
    const id = window.setInterval(() => {
      setFrameIndex((i) => (i + 1) % STEAM_FRAMES.length);
    }, 700);
    return () => window.clearInterval(id);
  }, [open, reducedMotion]);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const handleCopy = async () => {
    const text = buildBadge(deckLabel, badgeSlug, total);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard denied — silent */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="size-5 text-success" />
            {deckLabel} · {total}/{total} · 完走
          </DialogTitle>
          <DialogDescription>
            このデッキの全カードが mastered になりました。
          </DialogDescription>
        </DialogHeader>

        <pre
          aria-hidden
          className="my-2 whitespace-pre rounded-md bg-muted/50 p-4 text-center font-mono text-[13px] leading-5 text-muted-foreground"
        >
          {STEAM_FRAMES[frameIndex]}
        </pre>

        <div className="grid gap-1 font-mono text-[13px] text-muted-foreground">
          <div className="flex justify-between">
            <span>cards</span>
            <span className="tabular-nums text-foreground">
              {total} / {total}
            </span>
          </div>
          <div className="flex justify-between">
            <span>finished</span>
            <span className="tabular-nums text-foreground">
              {new Date().toLocaleDateString('ja-JP')}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className="gap-2"
          >
            {copied ? (
              <>
                <ClipboardCheck className="text-success" />
                Copied
              </>
            ) : (
              <>
                <Copy />
                Copy badge
              </>
            )}
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
