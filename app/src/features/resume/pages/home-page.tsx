import { Link } from 'react-router-dom';

import { AttestationPip } from '@/components/provenance/attestation-pip';
import { LastDeploysTimeline } from '@/components/provenance/last-deploys-timeline';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { generalQaBank } from '@/features/resume/data/general-qa';
import { useReturnAfterBreakToast } from '@/features/resume/lib/use-return-toast';
import { getProjectQa } from '@/features/resume/data/project-qa';
import { resumeProjects } from '@/features/resume/data/resume-projects';
import { useDeckProgress } from '@/features/resume/lib/use-deck-progress';
import { cn } from '@/lib/utils';

function DeckProgressBar({ mastered, total }: { mastered: number; total: number }) {
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground tabular-nums">{mastered}</strong>
          <span className="text-muted-foreground/70"> / {total} mastered</span>
        </span>
        <span className="tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct === 100
              ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
              : 'bg-gradient-to-r from-blue-400 to-blue-600',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: (typeof resumeProjects)[number] }) {
  const total = getProjectQa(project.id).length;
  const progress = useDeckProgress(`project-${project.id}`);
  return (
    <Link
      to={`/projects/${project.slug}`}
      className="group block overflow-hidden rounded-[26px] border border bg-card transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_16px_40px_rgba(37,99,235,0.12)]"
    >
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-muted/60 to-background">
        <img
          src={project.diagram.src}
          alt={`${project.code} architecture preview`}
          className="block h-36 w-full object-contain object-center transition duration-500 group-hover:scale-[1.02]"
          loading="lazy"
        />
        <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary backdrop-blur">
          {project.code}
        </div>
        {project.attested && (
          <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-2 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur">
            <AttestationPip
              kind="attested"
              size="sm"
              hideTooltip
              label={project.attestationSource}
            />
            <span className="font-mono text-[10px]">履歴書</span>
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold tracking-tight text-foreground group-hover:text-primary">
              {project.shortTitle}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{project.period}</div>
          </div>
          {progress.flagged > 0 ? (
            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
              ⚑ {progress.flagged}
            </span>
          ) : null}
        </div>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{project.subtitle}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {project.stageChips.slice(0, 3).map((chip) => (
            <span
              key={chip}
              className="rounded-full border border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {chip}
            </span>
          ))}
        </div>
        <DeckProgressBar mastered={progress.mastered} total={total} />
      </div>
    </Link>
  );
}

function StatsSummary() {
  const generalProgress = useDeckProgress('general-interview');
  // Read per-project progress one hook per project; order matches the source array.
  const p1 = useDeckProgress(`project-${resumeProjects[0]?.id ?? 'pj1'}`);
  const p2 = useDeckProgress(`project-${resumeProjects[1]?.id ?? 'pj2'}`);
  const p3 = useDeckProgress(`project-${resumeProjects[2]?.id ?? 'pj3'}`);
  const p4 = useDeckProgress(`project-${resumeProjects[3]?.id ?? 'pj4'}`);
  const p5 = useDeckProgress(`project-${resumeProjects[4]?.id ?? 'pj5'}`);
  const perProject = [p1, p2, p3, p4, p5];
  const projectTotal = resumeProjects.reduce(
    (acc, p) => acc + getProjectQa(p.id).length,
    0,
  );
  const projectMastered = perProject.reduce((acc, p) => acc + p.mastered, 0);
  const projectFlagged = perProject.reduce((acc, p) => acc + p.flagged, 0);
  const generalTotal = generalQaBank.length;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-[22px] border border-primary/30 bg-gradient-to-br from-blue-50 to-white p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Project Q&amp;A
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-bold tabular-nums text-foreground">
            {projectMastered}
          </span>
          <span className="text-sm text-muted-foreground">/ {projectTotal}</span>
        </div>
        <DeckProgressBar mastered={projectMastered} total={projectTotal} />
        <div className="mt-2 text-xs text-muted-foreground">5 案件 × 20 問 = 100 問</div>
      </div>

      <div className="rounded-[22px] border border-success/30 bg-gradient-to-br from-emerald-50 to-white p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-success">
          General Q&amp;A
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-bold tabular-nums text-foreground">
            {generalProgress.mastered}
          </span>
          <span className="text-sm text-muted-foreground">/ {generalTotal}</span>
        </div>
        <DeckProgressBar mastered={generalProgress.mastered} total={generalTotal} />
        <div className="mt-2 text-xs text-muted-foreground">基本 / 詳細設計 / 実装 / 運用 / 非技術</div>
      </div>

      <div className="rounded-[22px] border border-warning/30 bg-gradient-to-br from-amber-50 to-white p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-warning">
          Review Queue
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-bold tabular-nums text-foreground">
            {projectFlagged + generalProgress.flagged}
          </span>
          <span className="text-sm text-muted-foreground">flagged</span>
        </div>
        <div className="mt-3 text-xs leading-5 text-muted-foreground">
          答えに迷った問題を <kbd className="rounded bg-muted px-1 text-[10px]">F</kbd>{' '}
          で旗立てすると、デッキ内の「Flagged」フィルタでだけ回せます。
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  useReturnAfterBreakToast('general-interview');
  return (
    <div className="space-y-4">
      <Card className="gap-0 overflow-hidden p-7 xl:p-9">
        <div className="flex flex-col gap-6 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Flashcard Study Surface
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground xl:text-4xl">
              履歴書 5 案件 + 共通 229 題を、英単語カード方式で何度でも回す
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted-foreground">
              各案件ページで構成図 + 30/60/90 秒トーク + 案件 20 問のフラッシュカード、
              <Link to="/interview-prep" className="text-primary underline underline-offset-2">
                Interview Prep
              </Link>{' '}
              では共通 229 題を学習できます。 Mastered と Flagged の状態はブラウザに自動保存されます。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/interview-prep">共通 229 題を開く →</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link to="/projects/ec-site-foundation">PJ1 から順に見る</Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <LastDeploysTimeline />

      <StatsSummary />

      <Card className="gap-0 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              5 Projects
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              案件ページ (構成図 + 20 問デッキ)
            </h2>
          </div>
          <div className="text-xs text-muted-foreground">各カード = 構成図 + pitch + flashcard</div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {resumeProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
          <Link
            to="/interview-prep"
            className="group flex flex-col justify-between rounded-[26px] border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 transition hover:-translate-y-0.5 hover:border-success/60 hover:shadow-[0_16px_40px_color-mix(in_oklch,var(--color-success),transparent_85%)]"
          >
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-success">
                General
              </div>
              <div className="mt-1 text-lg font-semibold tracking-tight text-foreground group-hover:text-success">
                共通 229 問デッキ
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                履歴書に紐づかない、基本設計 / 詳細設計の考え方、インフラ宏観、非技術、フォールバック回答。
              </p>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground">
              Open deck →
            </div>
          </Link>
        </div>
      </Card>

      <Card className="gap-0 p-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Study tips
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: '声に出して答える',
              body: '質問を読んで 10 秒で答え始める習慣を作る。口が動かない = まだ自分の言葉になっていない。',
            },
            {
              title: '答え合わせは後回し',
              body: 'まず自分で答えてから Space で参照回答を表示。最初から読むと記憶に残らない。',
            },
            {
              title: '4 点フレームに寄せる',
              body: '入口 / 処理 / 保存 / 監視の 4 点。構成図のレーンと同じ順で話すとぶれない。',
            },
            {
              title: 'Flag → 毎日回す',
              body: '迷った問題は F キーで旗立て。翌日 Flagged フィルタだけで回せば効率的。',
            },
          ].map((tip) => (
            <div
              key={tip.title}
              className="rounded-[20px] border border bg-muted/30 p-4"
            >
              <div className="text-sm font-semibold text-foreground">{tip.title}</div>
              <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{tip.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
