import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  Copy,
  ExternalLink,
  FileCode,
  GitCommit,
  Info,
  Package,
  Share2,
  TerminalSquare,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AttestationPip } from '@/components/provenance/attestation-pip';
import { BorderBeam } from '@/components/ui/border-beam';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { runtimeEnv } from '@/lib/env';
import { cn } from '@/lib/utils';

/**
 * Self-proof footer.
 *
 * Fetches `/pipeline-info.json` (written into the S3 artifact by the Build
 * Release Assets workflow — Lab 8). Desktop: a compact mono strip along the
 * bottom. Mobile: a small floating pill bottom-right. Both expand the same
 * shadcn Dialog describing full deployment provenance as three hops —
 * Source (commit) → Build (workflow) → Artifact (release) — each carrying
 * an AttestationPip so the page is honest about what is pipeline-proven.
 *
 * First-flip policy: on a visitor's first page view, the Dialog auto-opens
 * 1.8 s after mount and a subtle border-beam rings the strip/pill for the
 * next 24 h. This is how the project announces "yes, this page shipped
 * through a real pipeline — here's the receipt."
 */

const FIRST_FLIP_KEY = 'pipeline-first-flip-seen';
const FIRST_FLIP_WINDOW_MS = 24 * 60 * 60 * 1000;

interface HistoryEntry {
  releaseTag: string;
  shortSha: string;
  shippedAt: string;
  commitSubject?: string;
}

interface PipelineInfo {
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
  history?: HistoryEntry[];
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
    typeof v.artifactKey === 'string' &&
    (v.buildDurationSec === undefined || typeof v.buildDurationSec === 'number') &&
    (v.imageSha === undefined || typeof v.imageSha === 'string')
  );
}

function formatBuildTime(iso: string): { timeStr: string; tz: string; dateStr: string } {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return { timeStr: iso, tz: '', dateStr: '' };
  }
  const timeStr = parsed.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const tz =
    new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
      .formatToParts(parsed)
      .find((part) => part.type === 'timeZoneName')?.value ?? '';
  return { timeStr, tz, dateStr };
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function readFirstFlip(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(FIRST_FLIP_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeFirstFlip(ts: number) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FIRST_FLIP_KEY, String(ts));
  } catch {
    /* storage denied — silent */
  }
}

export function PipelineBanner() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [firstFlipAt, setFirstFlipAt] = useState<number | null>(null);
  const autoOpenFired = useRef(false);

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
            setState({ status: 'bootstrap', reason: 'malformed pipeline-info.json' });
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
    setFirstFlipAt(readFirstFlip());
  }, []);

  useEffect(() => {
    if (autoOpenFired.current) return;
    if (state.status !== 'ready') return;
    if (firstFlipAt !== null) return;
    autoOpenFired.current = true;
    const timeout = window.setTimeout(() => {
      const ts = Date.now();
      writeFirstFlip(ts);
      setFirstFlipAt(ts);
      setOpen(true);
    }, 1800);
    return () => window.clearTimeout(timeout);
  }, [state.status, firstFlipAt]);

  const env = runtimeEnv(
    'APP_ENV',
    state.status === 'ready' ? state.info.env ?? 'local' : 'local',
  );
  const isBootstrap = state.status === 'bootstrap';
  const isReady = state.status === 'ready';

  const withinBeamWindow =
    firstFlipAt !== null && Date.now() - firstFlipAt < FIRST_FLIP_WINDOW_MS;

  const handleShare = async () => {
    if (!isReady) return;
    const info = state.info;
    const shareText = `🏗 Shipped this resume through a real CI/CD pipeline · ${info.releaseTag} · ${info.shortSha} · OIDC-deployed`;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const fullText = shareUrl ? `${shareText}\n${shareUrl}` : shareText;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Resume CI/CD', text: shareText, url: shareUrl });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`;
      window.open(intentUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const toneClasses = isBootstrap
    ? 'border-destructive/40 bg-destructive/10 text-destructive'
    : 'border-border bg-background/85 text-foreground';

  return (
    <>
      <footer
        role="contentinfo"
        aria-label="Pipeline provenance"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 hidden xl:block"
      >
        <div
          className={cn(
            'pointer-events-auto relative flex items-center justify-between gap-3 overflow-hidden border-t px-4 py-2 text-xs backdrop-blur-md transition-colors',
            toneClasses,
          )}
        >
          {withinBeamWindow && !isBootstrap && (
            <BorderBeam
              size={90}
              duration={9}
              colorFrom="var(--color-primary)"
              colorTo="var(--color-success)"
            />
          )}
          <div className="relative z-10 min-w-0 flex-1">
            {state.status === 'loading' && (
              <span className="text-muted-foreground">loading pipeline info…</span>
            )}
            {isBootstrap && (
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-3.5" aria-hidden />
                <span>BOOTSTRAP — pipeline hasn't shipped yet</span>
              </div>
            )}
            {isReady && (
              <div className="flex flex-col">
                <div className="truncate font-mono text-[12px]">
                  <span className="font-semibold text-foreground">{env}</span>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span className="font-medium text-foreground">{state.info.releaseTag}</span>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span className="text-foreground/80">{state.info.shortSha}</span>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    shipped {formatBuildTime(state.info.buildTimestamp).timeStr}
                    {formatBuildTime(state.info.buildTimestamp).tz &&
                      ` ${formatBuildTime(state.info.buildTimestamp).tz}`}
                  </span>
                </div>
                <div className="truncate text-[10px] text-muted-foreground">
                  Built by this pipeline · immutable artifact · OIDC-deployed
                </div>
              </div>
            )}
          </div>
          <div className="relative z-10 flex shrink-0 items-center gap-2">
            {isReady && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 rounded-full px-3 text-[11px]"
                onClick={() => {
                  void handleShare();
                }}
                aria-label="Share pipeline provenance"
              >
                {copied ? (
                  <>
                    <Check className="size-3" />
                    copied
                  </>
                ) : (
                  <>
                    <Share2 className="size-3" />
                    share
                  </>
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 rounded-full px-3 text-[11px]"
              onClick={() => setOpen(true)}
              aria-label="Show pipeline details"
            >
              <Info className="size-3" />
              pipeline info
            </Button>
          </div>
        </div>
      </footer>

      <div className="xl:hidden fixed bottom-3 right-3 z-30">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Show pipeline details"
          className={cn(
            'relative flex min-h-[40px] items-center gap-1.5 overflow-hidden rounded-full border px-3.5 py-2.5 text-[11px] shadow-sm backdrop-blur-md transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2',
            toneClasses,
          )}
        >
          {withinBeamWindow && !isBootstrap && (
            <BorderBeam
              size={40}
              duration={7}
              colorFrom="var(--color-primary)"
              colorTo="var(--color-success)"
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            {state.status === 'loading' && (
              <span className="text-muted-foreground">loading…</span>
            )}
            {isBootstrap && (
              <>
                <AlertTriangle className="size-3" aria-hidden />
                <span className="font-semibold">bootstrap</span>
              </>
            )}
            {isReady && (
              <>
                <span className="font-semibold">{env}</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-mono text-foreground/80">{state.info.shortSha}</span>
              </>
            )}
            <Info className="ml-0.5 size-3 text-muted-foreground" aria-hidden />
          </span>
        </button>
      </div>

      <PipelineDialog
        open={open}
        onOpenChange={setOpen}
        env={env}
        state={state}
        onShare={handleShare}
        copied={copied}
      />
    </>
  );
}

interface PipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  env: string;
  state: LoadState;
  onShare: () => void;
  copied: boolean;
}

function PipelineDialog({
  open,
  onOpenChange,
  env,
  state,
  onShare,
  copied,
}: PipelineDialogProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);

  const handleCopyJson = async () => {
    if (state.status !== 'ready') return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(state.info, null, 2));
      setJsonCopied(true);
      window.setTimeout(() => setJsonCopied(false), 1800);
    } catch {
      /* clipboard denied — silent */
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Pipeline provenance</DialogTitle>
            <DialogDescription>
              How this deployment got here — from source commit to running
              artifact.
            </DialogDescription>
          </DialogHeader>

          {state.status === 'loading' && (
            <div className="text-sm text-muted-foreground">loading…</div>
          )}

          {state.status === 'bootstrap' && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm leading-6 text-destructive">
              <p className="font-semibold">
                No pipeline-info.json on this deployment.
              </p>
              <p className="mt-2 text-destructive/90">
                This is expected in bootstrap state — before your first release
                merges and the build workflow writes{' '}
                <code className="rounded bg-destructive/20 px-1 font-mono">
                  /pipeline-info.json
                </code>{' '}
                into the S3 artifact. Once the step added in Lab 8 runs, this
                banner will flip to the live provenance.
              </p>
              <p className="mt-2 text-xs text-destructive/80">
                Fetch reason: <span className="font-mono">{state.reason}</span>
              </p>
            </div>
          )}

          {state.status === 'ready' && (
            <div className="grid gap-3">
              <HopCard
                icon={<GitCommit className="size-4" aria-hidden />}
                label="Source"
                kind="attested"
                attestLabel="このコミットは Git から検証可能です"
              >
                <div className="font-mono text-[13px]">
                  {state.info.sourceRepo ? (
                    <span className="text-foreground">{state.info.sourceRepo}</span>
                  ) : (
                    <span className="text-muted-foreground">source repo n/a</span>
                  )}
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span className="text-foreground">{state.info.shortSha}</span>
                </div>
                {state.info.commitSubject && (
                  <div className="text-[13px] italic text-foreground/80">
                    "{state.info.commitSubject}"
                  </div>
                )}
                {state.info.commitAuthor && (
                  <div className="text-xs text-muted-foreground">
                    by {state.info.commitAuthor}
                  </div>
                )}
              </HopCard>

              <HopCard
                icon={<TerminalSquare className="size-4" aria-hidden />}
                label="Build"
                kind="attested"
                attestLabel="GitHub Actions ワークフローで実行されました"
              >
                <div className="font-mono text-[13px]">
                  {state.info.workflowRunId ? (
                    <>
                      <span className="text-foreground">
                        run #{state.info.workflowRunId}
                      </span>
                      <span className="mx-1.5 text-muted-foreground">·</span>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">workflow run</span>
                      <span className="mx-1.5 text-muted-foreground">·</span>
                    </>
                  )}
                  <span className="text-foreground/80">
                    {state.info.buildDurationSec !== undefined
                      ? formatDuration(state.info.buildDurationSec)
                      : '—'}
                  </span>
                </div>
                {state.info.workflowRunUrl && (
                  <a
                    href={state.info.workflowRunUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    view run
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                )}
              </HopCard>

              <HopCard
                icon={<Package className="size-4" aria-hidden />}
                label="Artifact"
                kind="attested"
                attestLabel="S3 に保管された immutable artifact です"
              >
                <div className="font-mono text-[13px]">
                  <span className="font-semibold text-foreground">
                    {state.info.releaseTag}
                  </span>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span className="text-foreground/80">
                    shipped{' '}
                    {(() => {
                      const { dateStr, timeStr, tz } = formatBuildTime(
                        state.info.buildTimestamp,
                      );
                      return `${dateStr} ${timeStr}${tz ? ` ${tz}` : ''}`;
                    })()}
                  </span>
                </div>
                <div className="break-all font-mono text-[11px] text-muted-foreground">
                  {state.info.artifactKey}
                </div>
                {state.info.imageSha && (
                  <div className="break-all font-mono text-[11px] text-muted-foreground">
                    {state.info.imageSha}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  env <span className="font-mono text-foreground">{env}</span>{' '}
                  · immutable · OIDC-deployed
                </div>
              </HopCard>
            </div>
          )}

          {state.status === 'ready' && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyJson}
                className="gap-2"
              >
                {jsonCopied ? (
                  <>
                    <ClipboardCheck className="size-3.5 text-success" />
                    JSON copied
                  </>
                ) : (
                  <>
                    <FileCode className="size-3.5" />
                    Copy JSON
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShareOpen(true)}
                className="gap-2"
              >
                <TerminalSquare className="size-3.5" />
                Share as ASCII
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onShare}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Share2 className="size-3.5" />
                    Share
                  </>
                )}
              </Button>
            </div>
          )}

          <p className="text-xs leading-5 text-muted-foreground">
            This footer reads{' '}
            <code className="font-mono">/pipeline-info.json</code> at runtime —
            the file is written into the S3 artifact by the Build Release
            Assets workflow. If you're seeing BOOTSTRAP red on a deployed site,
            check that workflow ran and the artifact was uploaded.
          </p>
        </DialogContent>
      </Dialog>

      {state.status === 'ready' && (
        <ShareAsAsciiDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          info={state.info}
          env={env}
        />
      )}
    </>
  );
}

interface HopCardProps {
  icon: React.ReactNode;
  label: string;
  kind: 'attested' | 'imagined';
  attestLabel: string;
  children: React.ReactNode;
}

function HopCard({ icon, label, kind, attestLabel, children }: HopCardProps) {
  return (
    <div className="grid gap-1.5 rounded-md border bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground">
          {icon}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <span className="ml-auto">
          <AttestationPip kind={kind} label={attestLabel} />
        </span>
      </div>
      <div className="grid gap-0.5 pl-8">{children}</div>
    </div>
  );
}

interface ShareAsAsciiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  info: PipelineInfo;
  env: string;
}

function buildAsciiReceipt(info: PipelineInfo, env: string): string {
  const { dateStr, timeStr, tz } = formatBuildTime(info.buildTimestamp);
  const sourceRepo = info.sourceRepo ?? 'repository';
  const commitSubject = info.commitSubject ?? '(commit subject n/a)';
  const commitAuthor = info.commitAuthor ?? '—';
  const runLabel = info.workflowRunId
    ? `run #${info.workflowRunId}`
    : 'workflow run';
  const duration =
    info.buildDurationSec !== undefined
      ? formatDuration(info.buildDurationSec)
      : '—';
  const envLabel = env || 'local';
  const shippedLabel = `${dateStr} ${timeStr}${tz ? ` ${tz}` : ''}`.trim();

  const rows = [
    'Resume CI/CD provenance',
    '',
    `env       ${envLabel}`,
    `source    ${sourceRepo} @ ${info.shortSha}`,
    `commit    "${commitSubject}"`,
    `author    ${commitAuthor}`,
    `build     ${runLabel} · ${duration}`,
    `artifact  ${info.releaseTag}`,
    `shipped   ${shippedLabel}`,
  ];
  if (info.imageSha) rows.push(`image     ${info.imageSha}`);
  rows.push('', 'immutable · OIDC-deployed · pipeline-proven');

  const width = rows.reduce((acc, line) => Math.max(acc, line.length), 0);
  const pad = (line: string) => line.padEnd(width, ' ');
  const header = '┌' + '─'.repeat(width + 2) + '┐';
  const bottomLine = '└' + '─'.repeat(width + 2) + '┘';
  const body = rows.map((line) => `│ ${pad(line)} │`);
  return [header, ...body, bottomLine].join('\n');
}

function ShareAsAsciiDialog({
  open,
  onOpenChange,
  info,
  env,
}: ShareAsAsciiDialogProps) {
  const [copied, setCopied] = useState(false);
  const receipt = buildAsciiReceipt(info, env);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receipt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard denied — silent */
    }
  };

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Share as ASCII</DialogTitle>
          <DialogDescription>
            Paste this into a code fence, a commit description, or your
            elsewhere-profile — the receipt stays legible anywhere monospace
            renders.
          </DialogDescription>
        </DialogHeader>
        <pre className="max-h-[360px] overflow-auto rounded-md border bg-terminal-bg p-4 font-mono text-[12.5px] leading-[1.45] text-terminal-fg">
          {receipt}
        </pre>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <ClipboardCheck className="size-3.5 text-success" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                Copy receipt
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
