import { Keyboard } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Shortcut = { keys: string[]; hint: string };

const SECTIONS: Array<{ title: string; items: Shortcut[] }> = [
  {
    title: 'Navigation',
    items: [
      { keys: ['←', '→'], hint: '前 / 次のカード' },
      { keys: ['Esc'], hint: 'オーバーレイ / ダイアログを閉じる' },
    ],
  },
  {
    title: 'Study (free-drill)',
    items: [
      { keys: ['Space'], hint: '回答を表示 / 隠す' },
      { keys: ['K'], hint: 'mastered を切替' },
      { keys: ['F'], hint: 'flagged を切替' },
    ],
  },
  {
    title: 'Warmup (envelope)',
    items: [
      { keys: ['Space'], hint: '(1回目) 60秒カウントダウン開始' },
      { keys: ['Space'], hint: '(2回目) 参照回答を表示' },
      { keys: ['S'], hint: 'カウントダウンをスキップ' },
      { keys: ['C', 'P', 'X'], hint: 'covered / partial / missed' },
      { keys: ['R'], hint: '(recap) Review missed' },
      { keys: ['Enter'], hint: '(recap) Done' },
    ],
  },
  {
    title: 'Misc',
    items: [
      { keys: ['?'], hint: 'このオーバーレイ' },
      { keys: ['P'], hint: '$ prove it drawer (Phase 3)' },
    ],
  },
];

export function KeyboardHelpOverlay() {
  const [open, setOpen] = useState(false);

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
      if (event.key === '?') {
        event.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-5" />
            キーボードショートカット
          </DialogTitle>
          <DialogDescription>
            どのページでも{' '}
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              ?
            </kbd>{' '}
            でこの一覧を開閉できます。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5">
          {SECTIONS.map((section) => (
            <div key={section.title} className="grid gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {section.title}
              </div>
              <dl className="grid gap-1.5">
                {section.items.map((item, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[7rem_1fr] items-center gap-3 text-sm"
                  >
                    <dt className="flex flex-wrap gap-1">
                      {item.keys.map((k) => (
                        <kbd
                          key={k + i}
                          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground"
                        >
                          {k}
                        </kbd>
                      ))}
                    </dt>
                    <dd className="text-muted-foreground">{item.hint}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
