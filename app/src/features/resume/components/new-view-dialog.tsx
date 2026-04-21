import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type {
  SavedView,
  SavedViewColor,
  StudyState,
} from '@/features/resume/lib/deck-state';
import { cn } from '@/lib/utils';

type NewViewDialogProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onCreate: (view: SavedView) => void;
};

const STUDY_STATE_OPTIONS: Array<{ value: StudyState; label: string }> = [
  { value: 'all', label: 'すべて' },
  { value: 'unmastered', label: 'Unmastered' },
  { value: 'mastered', label: 'Mastered' },
  { value: 'flagged', label: 'Flagged' },
];

const COLOR_OPTIONS: Array<{ value: SavedViewColor; bg: string; ring: string }> = [
  { value: 'amber', bg: 'bg-amber-400', ring: 'ring-amber-400' },
  { value: 'emerald', bg: 'bg-emerald-400', ring: 'ring-emerald-400' },
  { value: 'blue', bg: 'bg-blue-400', ring: 'ring-blue-400' },
  { value: 'slate', bg: 'bg-slate-400', ring: 'ring-slate-400' },
];

function makeId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'view'}-${Date.now().toString(36)}`;
}

export function NewViewDialog({ open, onOpenChange, onCreate }: NewViewDialogProps) {
  const [name, setName] = useState('');
  const [studyState, setStudyState] = useState<StudyState>('unmastered');
  const [limitStr, setLimitStr] = useState('');
  const [isEnvelope, setIsEnvelope] = useState(false);
  const [color, setColor] = useState<SavedViewColor>('blue');

  const resetForm = () => {
    setName('');
    setStudyState('unmastered');
    setLimitStr('');
    setIsEnvelope(false);
    setColor('blue');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    const limit = Number.parseInt(limitStr, 10);
    const view: SavedView = {
      id: makeId(name),
      name: name.trim(),
      filter: {
        studyState,
        limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      },
      isEnvelope,
      color,
      createdAt: new Date().toISOString(),
      userCreated: true,
    };
    onCreate(view);
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[460px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新しいビューを作成</DialogTitle>
            <DialogDescription>
              フィルタ条件と学習サイズをプリセット化します。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="view-name">名前</Label>
              <Input
                id="view-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 金曜レビュー"
                autoFocus
                required
                maxLength={40}
              />
            </div>

            <div className="grid gap-2">
              <Label>学習状態</Label>
              <div className="flex flex-wrap gap-1.5">
                {STUDY_STATE_OPTIONS.map(({ value, label }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={studyState === value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStudyState(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="view-limit">
                上限 (任意){' '}
                <span className="text-xs font-normal text-muted-foreground">
                  空欄 = 上限なし
                </span>
              </Label>
              <Input
                id="view-limit"
                type="number"
                inputMode="numeric"
                min={1}
                max={500}
                value={limitStr}
                onChange={(e) => setLimitStr(e.target.value)}
                placeholder="例: 25"
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-3">
              <div className="space-y-0.5">
                <Label htmlFor="view-envelope">エンベロープモード</Label>
                <p className="text-xs text-muted-foreground">
                  60秒カウントダウン + 自己評価を有効化 (Phase 2.4 で実装)
                </p>
              </div>
              <Switch
                id="view-envelope"
                checked={isEnvelope}
                onCheckedChange={setIsEnvelope}
              />
            </div>

            <div className="grid gap-2">
              <Label>カラー</Label>
              <div className="flex items-center gap-2">
                {COLOR_OPTIONS.map(({ value, bg, ring }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setColor(value)}
                    aria-label={`${value} カラー`}
                    aria-pressed={color === value}
                    className={cn(
                      'size-6 rounded-full transition',
                      bg,
                      color === value
                        ? `ring-2 ring-offset-2 ring-offset-background ${ring}`
                        : 'opacity-70 hover:opacity-100',
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              ビューを作成
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
