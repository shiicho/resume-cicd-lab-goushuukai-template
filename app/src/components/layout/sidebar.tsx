import { Mail } from 'lucide-react';

import { InterviewLoopCard } from '@/components/interview-loop-card';
import { LangToggle } from '@/components/lang-toggle';
import { ModeToggle } from '@/components/mode-toggle';
import { ProveItTrigger } from '@/components/provenance/prove-it-drawer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ProjectNav } from '@/features/resume/components/project-nav';
import { readRuntimeInfo } from '@/lib/env';

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

const KEYBOARD_SHORTCUTS = [
  { keys: 'Space', hint: '回答を表示 / 隠す' },
  { keys: '← →', hint: 'カード移動' },
  { keys: 'K', hint: 'Mastered に倒す' },
  { keys: 'F', hint: 'Flag で復習対象' },
] as const;

export function Sidebar() {
  const runtime = readRuntimeInfo();

  return (
    <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[272px] flex-shrink-0 overflow-y-auto pr-1 xl:block">
      <div className="flex flex-col gap-3">
        <Card className="gap-1 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Goshuukai
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            面接準備ブートキャンプ
          </h1>
          <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
            履歴書 5 案件 + 共通 229
            問を、英単語カード方式で何度でも回せる学習デッキです。
          </p>
        </Card>

        <Card className="gap-0 p-4">
          <ProjectNav />
        </Card>

        <InterviewLoopCard variant="sidebar" />

        <Card className="gap-0 p-4 text-[13px] leading-6 text-muted-foreground">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Keyboard
          </div>
          <dl className="mt-2 space-y-1">
            {KEYBOARD_SHORTCUTS.map(({ keys, hint }) => (
              <div key={keys} className="flex items-center gap-2">
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                  {keys}
                </kbd>
                <span>{hint}</span>
              </div>
            ))}
          </dl>
        </Card>

        <ProveItTrigger variant="pill" className="self-start" />

        <details className="group">
          <summary className="flex cursor-pointer list-none items-center rounded-xl border bg-card px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition hover:bg-card/80">
            <span>Runtime &amp; workbook</span>
            <span className="ml-auto opacity-50 group-open:hidden">▾</span>
            <span className="ml-auto hidden opacity-50 group-open:inline">▴</span>
          </summary>
          <Card className="mt-2 gap-0 p-4 text-[12px] leading-6 text-muted-foreground">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="opacity-70">env</span>
                <strong className="font-mono text-foreground">
                  {runtime.env}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">version</span>
                <strong className="font-mono text-foreground">
                  {runtime.version}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">host</span>
                <strong className="font-mono text-foreground">
                  {runtime.hostname}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">commit</span>
                <strong className="font-mono text-foreground">
                  {runtime.commitSha.slice(0, 12)}
                </strong>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="text-[11px] leading-5">
              <span className="font-medium text-foreground">Sources:</span>{' '}
              <code className="font-mono text-primary">
                職務経歴書_吴秋海.xlsx
              </code>{' '}
              +{' '}
              <code className="font-mono text-primary">
                20.面试常见问题.xlsx
              </code>
            </div>
          </Card>
        </details>

        <div className="flex items-center justify-between gap-1 rounded-xl border bg-card p-2">
          <div className="flex items-center gap-1">
            <ModeToggle />
            <LangToggle />
          </div>
          <div className="flex items-center gap-1">
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="GitHub リポジトリを開く"
            >
              <a
                href="https://github.com/shiicho/resume-cicd-lab-goushuukai-template"
                target="_blank"
                rel="noreferrer noopener"
              >
                <GitHubMark className="size-4" />
              </a>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="メール"
            >
              <a href="mailto:ziweizhang.shiicho@gmail.com">
                <Mail />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
