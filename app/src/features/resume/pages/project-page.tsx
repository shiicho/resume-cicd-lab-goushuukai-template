import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AttestationPip } from '@/components/provenance/attestation-pip';
import { GitLogStrip } from '@/components/signatures/git-log-strip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArchitectureDiagram } from '@/features/resume/components/architecture-diagram';
import { FlashcardDeck } from '@/features/resume/components/flashcard-deck';
import {
  getProjectAttestation,
  getProjectQa,
} from '@/features/resume/data/project-qa';
import {
  resumeProjects,
  type ResumeProject,
} from '@/features/resume/data/resume-projects';

function NeighborLinks({ project }: { project: ResumeProject }) {
  const index = resumeProjects.findIndex((item) => item.id === project.id);
  const previous = resumeProjects[index - 1];
  const next = resumeProjects[index + 1];

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {previous ? (
        <Link
          to={`/projects/${previous.slug}`}
          className="rounded-[24px] border border-border bg-white/90 p-4 text-sm transition hover:border-border hover:bg-white"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Previous
          </div>
          <div className="mt-2 font-semibold text-foreground">
            {previous.code} {previous.shortTitle}
          </div>
        </Link>
      ) : (
        <div className="rounded-[24px] border border-dashed border-border bg-muted/50/70 p-4 text-sm text-muted-foreground">
          最初の案件ページです。
        </div>
      )}
      {next ? (
        <Link
          to={`/projects/${next.slug}`}
          className="rounded-[24px] border border-border bg-white/90 p-4 text-right text-sm transition hover:border-border hover:bg-white"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Next
          </div>
          <div className="mt-2 font-semibold text-foreground">
            {next.code} {next.shortTitle}
          </div>
        </Link>
      ) : (
        <div className="rounded-[24px] border border-dashed border-border bg-muted/50/70 p-4 text-sm text-muted-foreground">
          最後の案件ページです。
        </div>
      )}
    </div>
  );
}

export function ProjectPage({ project }: { project: ResumeProject }) {
  return (
    <div className="space-y-4">
      <Card className="gap-0 overflow-hidden p-8">
        <div className="flex flex-col gap-8 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="max-w-4xl">
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link to="/">
                <ArrowLeft />
                Overview
              </Link>
            </Button>
            <GitLogStrip
              className="mt-5"
              code={project.code}
              period={project.period}
              label={project.shortTitle}
              role={project.role}
              team={project.team}
            />
            {project.attested && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border bg-muted/40 px-2.5 py-1">
                <AttestationPip
                  kind="attested"
                  size="sm"
                  label={project.attestationSource}
                />
                <span className="font-mono text-[11px] text-muted-foreground">
                  {project.attestationSource ?? '職務経歴書'}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  · 履歴書に直接記載された案件
                </span>
              </div>
            )}
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground xl:text-5xl">
              {project.title}
            </h1>
            <p className="mt-4 max-w-4xl text-[15px] leading-8 text-muted-foreground">
              {project.summary}
            </p>
          </div>

          <div className="grid max-w-xl gap-3 rounded-[24px] border border-border bg-muted/50/90 p-4 text-sm text-muted-foreground">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Learning Focus
            </div>
            <div className="rounded-[20px] border border-primary/30 bg-primary/10/70 p-4 leading-7 text-foreground/85">
              {project.learningFocus}
            </div>
            <div className="flex flex-wrap gap-2">
              {project.stageChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-foreground/85"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <ArchitectureDiagram diagram={project.diagram} code={project.code} />

      <Card className="gap-0 p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              30 / 60 / 90 秒トーク
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              時間に合わせて広げる話し方
            </h2>
          </div>
        </div>
        <Tabs defaultValue={project.tracks[0]?.label}>
          <TabsList>
            {project.tracks.map((track) => (
              <TabsTrigger key={track.label} value={track.label}>
                {track.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {project.tracks.map((track) => (
            <TabsContent
              key={track.label}
              value={track.label}
              className="mt-4 rounded-[18px] border bg-muted/40 p-5 text-sm leading-7 text-foreground/80"
            >
              {track.body}
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      <FlashcardDeck
        entries={getProjectQa(project.id).map((qa) => ({
          id: qa.id,
          question: qa.question,
          answer: qa.answer,
          category: qa.category,
          hint: qa.projectLabel,
          attestation: getProjectAttestation(qa),
        }))}
        storageKey={`project-${project.id}`}
        eyebrow={`${project.code} Interview Q&A`}
        title={`${project.shortTitle} フラッシュカード`}
        description="workbook の 面接Q&A シートから抽出した 20 問。自分で答えた上で参照回答と比べ、mastered に倒していく英単語カード学習スタイルです。進捗はブラウザ localStorage に自動保存されます。"
        emptyMessage="この案件の Q&A はまだ登録されていません。"
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="gap-0 p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            担当範囲
          </div>
          <div className="mt-4 space-y-3">
            {project.responsibilities.map((item) => (
              <div
                key={item}
                className="rounded-[20px] border border-border bg-muted/50/80 px-4 py-3 text-sm leading-7 text-foreground/85"
              >
                {item}
              </div>
            ))}
          </div>
        </Card>

        <Card className="gap-0 p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Tech / Keywords
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {project.techChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-border bg-white px-3 py-1 text-sm text-foreground/85"
              >
                {chip}
              </span>
            ))}
          </div>
        </Card>

        <Card className="gap-0 p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            深掘りの入口 / Evidence
          </div>
          <div className="mt-4 space-y-2">
            {project.followUps.map((item) => (
              <div
                key={item}
                className="rounded-[18px] border border-dashed border-border bg-white px-4 py-3 text-sm text-foreground/85"
              >
                {item}
              </div>
            ))}
            <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              {project.evidence.map((item) => (
                <div key={item} className="leading-7">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <NeighborLinks project={project} />
    </div>
  );
}
