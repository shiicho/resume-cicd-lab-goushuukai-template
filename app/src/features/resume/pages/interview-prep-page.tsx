import { ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FlashcardDeck } from '@/features/resume/components/flashcard-deck';
import { NewViewDialog } from '@/features/resume/components/new-view-dialog';
import { SavedViewsBar } from '@/features/resume/components/saved-views-bar';
import { generalQaBank } from '@/features/resume/data/general-qa';
import {
  addSavedView,
  applyViewFilter,
  ensureDefaultViews,
  loadDeckState,
  type SavedView,
} from '@/features/resume/lib/deck-state';
import { useDeckProgress } from '@/features/resume/lib/use-deck-progress';

const STORAGE_KEY = 'general-interview';

const flashcards = generalQaBank.map((entry) => ({
  id: entry.id,
  question: entry.question,
  answer: entry.answer,
  category: entry.major || '共通',
  subCategory: entry.sub || undefined,
  hint: entry.subsub || undefined,
}));

export function InterviewPrepPage() {
  const [views, setViews] = useState<SavedView[]>(() =>
    ensureDefaultViews(STORAGE_KEY),
  );
  const [activeViewId, setActiveViewId] = useState<string>(views[0]?.id ?? 'all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const activeView = views.find((v) => v.id === activeViewId);

  const progress = useDeckProgress(STORAGE_KEY);

  const viewCounts = useMemo(() => {
    const state = loadDeckState(STORAGE_KEY);
    return Object.fromEntries(
      views.map((v) => [v.id, applyViewFilter(flashcards, state, v).length]),
    );
  }, [views, progress.mastered, progress.flagged]);

  const handleCreateView = (view: SavedView) => {
    addSavedView(STORAGE_KEY, view);
    setViews((prev) => [...prev, view]);
    setActiveViewId(view.id);
  };

  return (
    <div className="space-y-4">
      <Card className="gap-0 overflow-hidden p-8">
        <div className="flex flex-col gap-6 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="max-w-4xl">
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link to="/">
                <ArrowLeft />
                Overview
              </Link>
            </Button>
            <div className="mt-4 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              General Interview Prep
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-foreground xl:text-5xl">
              面接でよく聞かれる共通問題 229 題
            </h1>
            <p className="mt-4 max-w-4xl text-[15px] leading-8 text-muted-foreground">
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-primary">
                source/20.面试常见问题.xlsx
              </code>
              を再読し、履歴書の具体設計・実装・試験まわり、インフラの宏観的な問い、
              非技術の定番質問、そして「分からないとき」のフォールバック回答を 1 つのデッキにしました。
              声に出して答え、参照回答と比較してから mastered に倒す — 英単語カード学習と同じ使い方ができます。
            </p>
          </div>

          <div className="grid gap-2 rounded-[24px] border bg-muted/40 p-4 text-sm text-muted-foreground xl:min-w-[320px]">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              How to use
            </div>
            <ul className="mt-1 space-y-2 text-sm leading-6 text-foreground/90">
              <li>
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  1
                </span>
                質問を見て自分で声に出して答える
              </li>
              <li>
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  2
                </span>
                <kbd className="rounded bg-muted px-1.5 py-0.5 text-[11px]">Space</kbd> で参照回答を表示
              </li>
              <li>
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  3
                </span>
                答えられた → <kbd className="rounded bg-muted px-1.5 py-0.5 text-[11px]">K</kbd> で mastered
              </li>
              <li>
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  4
                </span>
                迷った → <kbd className="rounded bg-muted px-1.5 py-0.5 text-[11px]">F</kbd> で Flag → あとで復習
              </li>
              <li>
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  5
                </span>
                <kbd className="rounded bg-muted px-1.5 py-0.5 text-[11px]">←</kbd>
                <kbd className="mx-1 rounded bg-muted px-1.5 py-0.5 text-[11px]">→</kbd> で次の問題へ
              </li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="gap-0 p-5">
        <SavedViewsBar
          views={views}
          activeViewId={activeViewId}
          onSelect={setActiveViewId}
          onCreate={() => setDialogOpen(true)}
          counts={viewCounts}
        />
      </Card>

      <NewViewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={handleCreateView}
      />

      <FlashcardDeck
        entries={flashcards}
        storageKey={STORAGE_KEY}
        eyebrow="General Q&A Deck"
        title="共通 229 問フラッシュカード"
        description="保存済みビューで絞り込み、shuffle で順序を変えつつ、mastered 数を伸ばしていきます。進捗は自動で保存されるので、閉じても翌日続きから再開できます。"
        activeView={activeView}
      />
    </div>
  );
}
