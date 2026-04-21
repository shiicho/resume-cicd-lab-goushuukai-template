import {
  ExternalLink,
  ShieldCheck,
  TerminalSquare,
} from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export interface PipelineInfo {
  releaseTag: string;
  shortSha: string;
  buildTimestamp: string;
  artifactKey: string;
  buildDurationSec?: number;
  imageSha?: string;
  env?: string;
  sourceRepo?: string;
  commitSubject?: string;
  commitAuthor?: string;
  workflowRunId?: string;
  workflowRunUrl?: string;
  tlogUuid?: string;
  tlogIndex?: number;
  history?: Array<{
    releaseTag: string;
    shortSha: string;
    shippedAt: string;
    commitSubject?: string;
  }>;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; info: PipelineInfo }
  | { status: 'bootstrap'; reason: string };

function isPipelineInfo(value: unknown): value is PipelineInfo {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.releaseTag === 'string' &&
    typeof v.shortSha === 'string' &&
    typeof v.buildTimestamp === 'string' &&
    typeof v.artifactKey === 'string'
  );
}

function formatDuration(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0)
    return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatShippedLabel(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  const dateStr = parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = parsed.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const tz =
    new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
      .formatToParts(parsed)
      .find((part) => part.type === 'timeZoneName')?.value ?? '';
  return `${dateStr} ${timeStr}${tz ? ` ${tz}` : ''}`;
}

interface ProveItContextValue {
  open: (options?: { focusSha?: string }) => void;
  state: LoadState;
}

const ProveItContext = createContext<ProveItContextValue | null>(null);

export function useProveIt(): ProveItContextValue {
  const ctx = useContext(ProveItContext);
  if (!ctx) throw new Error('useProveIt must be used inside ProveItProvider');
  return ctx;
}

export function ProveItProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [focusSha, setFocusSha] = useState<string | undefined>(undefined);
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/pipeline-info.json', { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled)
            setState({ status: 'bootstrap', reason: `HTTP ${res.status}` });
          return;
        }
        const data: unknown = await res.json();
        if (!isPipelineInfo(data)) {
          if (!cancelled)
            setState({
              status: 'bootstrap',
              reason: 'malformed pipeline-info.json',
            });
          return;
        }
        if (!cancelled) setState({ status: 'ready', info: data });
      } catch (err) {
        if (!cancelled)
          setState({
            status: 'bootstrap',
            reason: err instanceof Error ? err.message : 'fetch failed',
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'p' && event.key !== 'P') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const active = document.activeElement as HTMLElement | null;
      const isInput =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        !!active?.isContentEditable;
      if (isInput) return;
      event.preventDefault();
      setFocusSha(undefined);
      setOpen((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ctxValue = useMemo<ProveItContextValue>(
    () => ({
      open: ({ focusSha: fs } = {}) => {
        setFocusSha(fs);
        setOpen(true);
      },
      state,
    }),
    [state],
  );

  return (
    <ProveItContext.Provider value={ctxValue}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-[560px]"
        >
          <SheetHeader className="border-b px-6 py-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-success" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Prove it
              </span>
            </div>
            <SheetTitle className="text-lg font-semibold">
              Pipeline proof
            </SheetTitle>
            <SheetDescription className="text-[13px] leading-6">
              このページがどの commit・どの build・どの artifact から来たのか、
              cosign 風レシートで確認できます。
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <ProveItReceipt state={state} focusSha={focusSha} />
          </div>
        </SheetContent>
      </Sheet>
    </ProveItContext.Provider>
  );
}

interface ProveItTriggerProps {
  variant?: 'pill' | 'icon';
  className?: string;
}

export function ProveItTrigger({ variant = 'pill', className }: ProveItTriggerProps) {
  const { open } = useProveIt();

  if (variant === 'icon') {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => open()}
        aria-label="Pipeline proof を開く ($ prove it)"
        aria-keyshortcuts="P"
        className={className}
      >
        <ShieldCheck />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => open()}
      aria-keyshortcuts="P"
      className={cn(
        'h-8 gap-1.5 rounded-full px-3 font-mono text-[11px]',
        className,
      )}
    >
      <TerminalSquare className="size-3.5" />
      $ prove it
      <kbd className="ml-0.5 rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">
        P
      </kbd>
    </Button>
  );
}

interface ProveItReceiptProps {
  state: LoadState;
  focusSha?: string;
}

function ProveItReceipt({ state, focusSha }: ProveItReceiptProps) {
  if (state.status === 'loading') {
    return (
      <div className="text-sm text-muted-foreground">
        <span className="font-mono">$ cosign verify …</span>
      </div>
    );
  }

  if (state.status === 'bootstrap') {
    return <BootstrapReceipt reason={state.reason} />;
  }

  return <ReadyReceipt info={state.info} focusSha={focusSha} />;
}

function BootstrapReceipt({ reason }: { reason: string }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-terminal-bg px-4 py-4 font-mono text-[12.5px] leading-[1.55] text-terminal-fg">
        <div className="text-terminal-accent">
          $ cosign verify shiicho/resume-cicd-lab-goushuukai-template
        </div>
        <div className="text-destructive">✗ No pipeline-info.json on this deployment</div>
        <div className="pl-4 text-terminal-dim">
          Fetch reason: <span className="text-terminal-fg">{reason}</span>
        </div>
      </div>
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm leading-6 text-destructive">
        <p className="font-semibold">Bootstrap state — no receipt to verify.</p>
        <p className="mt-2 text-destructive/90">
          The build workflow hasn't written{' '}
          <code className="rounded bg-destructive/20 px-1 font-mono">
            /pipeline-info.json
          </code>{' '}
          into the S3 artifact yet. Once Lab 8's step lands and the next
          release ships, this drawer flips to a live verification.
        </p>
      </div>
    </div>
  );
}

function ReadyReceipt({
  info,
  focusSha,
}: {
  info: PipelineInfo;
  focusSha?: string;
}) {
  const sourceRepo = info.sourceRepo ?? 'repository';
  const subject = `sha256:${(info.imageSha ?? info.shortSha).replace(/^sha256:/, '')}`;
  const envLabel = info.env ?? 'n/a';
  const shaLabel = focusSha ?? info.shortSha;

  const githubRunUrl = info.workflowRunUrl;
  const releaseUrl = info.sourceRepo
    ? `https://github.com/${info.sourceRepo}/releases/tag/${info.releaseTag}`
    : null;

  return (
    <div className="space-y-5">
      <pre className="overflow-x-auto rounded-md border bg-terminal-bg px-4 py-4 font-mono text-[12.5px] leading-[1.55] text-terminal-fg">
{`$ cosign verify ${sourceRepo}
Verification for ${sourceRepo}@${subject}
--
`}<span className="text-success">✓</span>{` Source attestation    ${sourceRepo} @ ${shaLabel}
`}<span className="text-success">✓</span>{` Build attestation     ${
  info.workflowRunId ? `run #${info.workflowRunId}` : 'workflow run'
} · ${formatDuration(info.buildDurationSec)}
`}<span className="text-success">✓</span>{` Artifact attestation  ${info.releaseTag}
`}<span className="text-success">✓</span>{` Certificate identity  OIDC keyless (GitHub Actions)
`}<span className="text-success">✓</span>{` Transparency log      ${
  info.tlogUuid ?? 'tlog.sigstore.dev'
}

env        ${envLabel}
artifact   ${info.artifactKey}
${info.imageSha ? `image      ${info.imageSha}\n` : ''}shipped    ${formatShippedLabel(info.buildTimestamp)}
`}
      </pre>

      {info.commitSubject && (
        <div className="rounded-md border bg-muted/30 p-4 text-[13px] leading-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Commit subject
          </div>
          <div className="mt-1 italic text-foreground/90">
            "{info.commitSubject}"
          </div>
          {info.commitAuthor && (
            <div className="mt-1 text-xs text-muted-foreground">
              by {info.commitAuthor}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {githubRunUrl && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-full px-3 text-[12px]"
          >
            <a
              href={githubRunUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Workflow run を GitHub で開く"
            >
              <TerminalSquare className="size-3.5" />
              View workflow run
              <ExternalLink className="size-3" aria-hidden />
            </a>
          </Button>
        )}
        {releaseUrl && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-full px-3 text-[12px]"
          >
            <a
              href={releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Release tag を GitHub で開く"
            >
              <ExternalLink className="size-3" aria-hidden />
              {info.releaseTag}
            </a>
          </Button>
        )}
        <Badge variant="secondary" className="font-mono text-[10px]">
          immutable · OIDC · keyless
        </Badge>
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        レシートは <code className="font-mono">/pipeline-info.json</code> から
        組み立てています。キーレス署名・OIDC フェデレーション・transparency log
        は parent repo の Lab 8〜10 で追加する実装段階です。
      </p>
    </div>
  );
}
