import {
  Activity,
  Cable,
  Cpu,
  Database,
  DoorOpen,
  Expand,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { AttestationPip } from '@/components/provenance/attestation-pip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type {
  DiagramNode,
  DiagramNodeRole,
  ResumeDiagram,
} from '@/features/resume/data/resume-projects';
import { projectQaBank } from '@/features/resume/data/project-qa';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'attested' | 'imagined';

const ROLE_ORDER: DiagramNodeRole[] = [
  'entry',
  'compute',
  'storage',
  'monitoring',
  'integration',
  'governance',
];

const ROLE_META: Record<
  DiagramNodeRole,
  { label: string; icon: typeof Cpu }
> = {
  entry: { label: 'エントリー (入口)', icon: DoorOpen },
  compute: { label: '処理', icon: Cpu },
  storage: { label: '保存', icon: Database },
  monitoring: { label: '監視', icon: Activity },
  integration: { label: '連携', icon: Cable },
  governance: { label: 'ガバナンス', icon: ShieldCheck },
};

export function ArchitectureDiagram({
  diagram,
  code,
}: {
  diagram: ResumeDiagram;
  code: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeNode, setActiveNode] = useState<DiagramNode | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const nodes = diagram.nodes ?? [];
  const attestedCount = nodes.filter((n) => n.attested).length;
  const imaginedCount = nodes.length - attestedCount;

  const filteredNodes = useMemo(() => {
    if (filter === 'attested') return nodes.filter((n) => n.attested);
    if (filter === 'imagined') return nodes.filter((n) => !n.attested);
    return nodes;
  }, [nodes, filter]);

  const grouped = useMemo(() => {
    const out: Partial<Record<DiagramNodeRole, DiagramNode[]>> = {};
    for (const node of filteredNodes) {
      (out[node.role] ??= []).push(node);
    }
    return out;
  }, [filteredNodes]);

  return (
    <Card className="gap-0 p-6">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {code} Architecture
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            構成図 — 入口・処理・保存・監視
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
            {diagram.caption}
          </p>
        </div>
        <Dialog open={expanded} onOpenChange={setExpanded}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="self-start rounded-full"
              aria-label="拡大表示"
            >
              <Expand />
              拡大
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[min(1400px,96vw)] max-w-none gap-0 p-0 sm:max-w-none">
            <DialogHeader className="px-6 py-4 [.border-b]:pb-4 border-b">
              <DialogTitle className="text-sm font-semibold">
                {code} Architecture
              </DialogTitle>
              <DialogDescription className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                構成図 — 拡大表示
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto bg-muted/40 p-4">
              <img
                src={diagram.src}
                alt={`${code} architecture diagram (expanded)`}
                className="mx-auto block h-auto w-full max-w-[1400px]"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-[18px] border bg-background">
        <img
          src={diagram.src}
          alt={`${code} architecture diagram`}
          className="block h-auto w-full"
          loading="lazy"
        />
      </div>

      {nodes.length > 0 ? (
        <div className="mt-5 grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Components · tap a row for role + related Q&A
            </div>
            <div className="ml-auto flex items-center gap-1.5 rounded-full border bg-muted/30 p-0.5">
              <FilterChip
                active={filter === 'all'}
                onClick={() => setFilter('all')}
                label={`All · ${nodes.length}`}
              />
              <FilterChip
                active={filter === 'attested'}
                onClick={() => setFilter('attested')}
                pipKind="attested"
                label={`Attested · ${attestedCount}`}
              />
              <FilterChip
                active={filter === 'imagined'}
                onClick={() => setFilter('imagined')}
                pipKind="imagined"
                label={`Imagined · ${imaginedCount}`}
              />
            </div>
          </div>

          {ROLE_ORDER.map((role) => {
            const roleNodes = grouped[role];
            if (!roleNodes || roleNodes.length === 0) return null;
            const meta = ROLE_META[role];
            const Icon = meta.icon;
            return (
              <div key={role} className="grid gap-2">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Icon className="size-3.5" aria-hidden />
                  {meta.label}
                </div>
                <ol className="grid gap-1 md:grid-cols-2">
                  {roleNodes.map((node) => (
                    <li key={node.id}>
                      <button
                        type="button"
                        onClick={() => setActiveNode(node)}
                        className={cn(
                          'group flex w-full items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-left transition',
                          'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                        )}
                        aria-label={`${node.label} の役割を開く`}
                      >
                        <AttestationPip
                          kind={node.attested ? 'attested' : 'imagined'}
                          size="sm"
                          hideTooltip
                        />
                        <span className="flex-1 truncate text-[13px] font-medium text-foreground">
                          {node.label}
                        </span>
                        <ExternalLink
                          className="size-3.5 text-muted-foreground/60 transition group-hover:text-foreground"
                          aria-hidden
                        />
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}

          {filteredNodes.length === 0 && (
            <div className="rounded-md border border-dashed bg-muted/20 p-4 text-center text-[12px] text-muted-foreground">
              該当するノードはありません。
            </div>
          )}
        </div>
      ) : (
        <LegacyLegend diagram={diagram} />
      )}

      <NodeDetailSheet
        node={activeNode}
        code={code}
        onOpenChange={(open) => {
          if (!open) setActiveNode(null);
        }}
      />
    </Card>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  pipKind,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  pipKind?: 'attested' | 'imagined';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
      aria-pressed={active}
    >
      {pipKind && <AttestationPip kind={pipKind} size="sm" hideTooltip />}
      {label}
    </button>
  );
}

function NodeDetailSheet({
  node,
  code,
  onOpenChange,
}: {
  node: DiagramNode | null;
  code: string;
  onOpenChange: (open: boolean) => void;
}) {
  const relatedQas = useMemo(() => {
    if (!node?.relatedQaIds || node.relatedQaIds.length === 0) return [];
    const idSet = new Set(node.relatedQaIds);
    return projectQaBank.filter((qa) => idSet.has(qa.id));
  }, [node]);

  const open = node !== null;
  const roleMeta = node ? ROLE_META[node.role] : null;
  const Icon = roleMeta?.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]"
      >
        <SheetHeader className="border-b px-6 py-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {Icon && <Icon className="size-3.5" aria-hidden />}
            {code} · {roleMeta?.label ?? 'Component'}
          </div>
          <SheetTitle className="mt-1 text-lg font-semibold">
            {node?.label ?? ''}
          </SheetTitle>
          <SheetDescription className="mt-2 text-[13px] leading-6">
            {node?.description ?? ''}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {node && (
            <div className="flex flex-wrap items-center gap-2">
              <AttestationPip
                kind={node.attested ? 'attested' : 'imagined'}
                size="md"
              />
              <Badge
                variant={node.attested ? 'secondary' : 'outline'}
                className={cn(
                  'font-mono text-[10px] uppercase tracking-[0.16em]',
                  node.attested
                    ? 'bg-success/15 text-success hover:bg-success/15'
                    : 'text-muted-foreground',
                )}
              >
                {node.attested ? 'Attested · 履歴書根拠' : 'Imagined · 補完プラクティス'}
              </Badge>
            </div>
          )}

          {node?.cfnHint && (
            <div className="grid gap-1.5 rounded-md border bg-muted/30 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                CFN / IaC hint
              </div>
              <code className="break-words font-mono text-[12.5px] text-foreground">
                {node.cfnHint}
              </code>
            </div>
          )}

          {relatedQas.length > 0 ? (
            <div className="grid gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                関連する面接 Q&A · {relatedQas.length}
              </div>
              <ol className="grid gap-1.5">
                {relatedQas.map((qa) => (
                  <li
                    key={qa.id}
                    className="grid gap-0.5 rounded-md border bg-background px-3 py-2"
                  >
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="font-mono">{qa.id}</span>
                      <span>·</span>
                      <span>{qa.category}</span>
                    </div>
                    <div className="text-[13px] font-medium leading-5 text-foreground">
                      {qa.question}
                    </div>
                  </li>
                ))}
              </ol>
              <p className="text-[11px] text-muted-foreground">
                フラッシュカードで具体的な回答を確認できます。
              </p>
            </div>
          ) : (
            node && (
              <p className="text-[11px] text-muted-foreground">
                このノードに紐づく Q&A はまだ登録されていません。
              </p>
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LegacyLegend({ diagram }: { diagram: ResumeDiagram }) {
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      <DiagramLegendCard
        tone="resume"
        title="職務経歴書から"
        description="面接で「この構成のこの部分は自分が担当した」と素直に言える要素。"
        items={diagram.fromResume}
      />
      <DiagramLegendCard
        tone="imagined"
        title="標準プラクティスとして補完"
        description="職務経歴書には明示されていないが、業界標準として描画した構成要素。面接では「標準的にこう置く前提」で言及できる範囲。"
        items={diagram.imagined}
      />
    </div>
  );
}

function DiagramLegendCard({
  tone,
  title,
  description,
  items,
}: {
  tone: 'resume' | 'imagined';
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div
      className={cn(
        'rounded-[20px] border p-5',
        tone === 'resume'
          ? 'border-success/40 bg-success/5'
          : 'border-info/40 bg-info/5',
      )}
    >
      <div className="flex items-center gap-2">
        <AttestationPip
          kind={tone === 'resume' ? 'attested' : 'imagined'}
          size="sm"
          hideTooltip
        />
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {tone === 'resume' ? 'Evidence' : 'Standard practice'}
        </span>
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
        {description}
      </p>
      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 text-[13px] leading-6 text-foreground/80"
          >
            <span className="mt-2 inline-block size-1.5 flex-shrink-0 rounded-full bg-muted-foreground/50" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
