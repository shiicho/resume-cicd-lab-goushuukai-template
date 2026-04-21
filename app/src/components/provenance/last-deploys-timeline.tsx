import { ArrowUpRight, GitCommit } from 'lucide-react';
import { useMemo } from 'react';

import { AttestationPip } from '@/components/provenance/attestation-pip';
import { useProveIt } from '@/components/provenance/prove-it-drawer';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TimelineRow {
  releaseTag: string;
  shortSha: string;
  shippedAt: string;
  commitSubject?: string;
  live: boolean;
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
  return `${dateStr} ${timeStr}`;
}

export function LastDeploysTimeline() {
  const { state, open } = useProveIt();

  const rows = useMemo<TimelineRow[]>(() => {
    if (state.status !== 'ready') return [];
    const info = state.info;
    const current: TimelineRow = {
      releaseTag: info.releaseTag,
      shortSha: info.shortSha,
      shippedAt: info.buildTimestamp,
      commitSubject: info.commitSubject,
      live: true,
    };
    const history = (info.history ?? [])
      .filter((h) => h.shortSha !== info.shortSha)
      .map<TimelineRow>((h) => ({
        releaseTag: h.releaseTag,
        shortSha: h.shortSha,
        shippedAt: h.shippedAt,
        commitSubject: h.commitSubject,
        live: false,
      }));
    return [current, ...history].slice(0, 5);
  }, [state]);

  if (state.status === 'loading') {
    return null;
  }

  return (
    <Card className="gap-0 p-5 xl:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Last 5 deploys
          </div>
          <h2 className="mt-1 text-sm font-semibold tracking-tight">
            このページが辿った pipeline の軌跡
          </h2>
        </div>
        <span className="hidden text-[11px] text-muted-foreground sm:inline">
          tap a row for the full cosign receipt
        </span>
      </div>

      {state.status === 'bootstrap' && (
        <div className="mt-4 rounded-md border border-dashed bg-muted/30 p-4 text-[12px] leading-5 text-muted-foreground">
          まだ pipeline が 1 度も ship していないので、タイムラインは空です。
          Lab 8 の workflow step が走って
          <code className="mx-1 rounded bg-muted px-1 font-mono text-[11px]">
            /pipeline-info.json
          </code>
          が出荷されると、ここに履歴が積まれていきます。
        </div>
      )}

      {state.status === 'ready' && rows.length === 0 && (
        <div className="mt-4 text-[12px] text-muted-foreground">
          No deploy history available yet.
        </div>
      )}

      {state.status === 'ready' && rows.length > 0 && (
        <ol className="mt-3 divide-y divide-border rounded-md border bg-muted/20">
          {rows.map((row) => (
            <li key={`${row.releaseTag}-${row.shortSha}`}>
              <button
                type="button"
                onClick={() => open({ focusSha: row.shortSha })}
                className={cn(
                  'group flex w-full items-center gap-3 px-4 py-3 text-left transition',
                  'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                )}
                aria-label={`${row.releaseTag} ${row.shortSha} のパイプライン受領証を表示`}
              >
                <AttestationPip
                  kind="attested"
                  size="sm"
                  hideTooltip
                  className={cn(!row.live && 'opacity-60')}
                />
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <div className="flex items-center gap-2 font-mono text-[12.5px]">
                    <span className="font-semibold text-foreground">
                      {row.releaseTag}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-foreground/80">{row.shortSha}</span>
                    {row.live && (
                      <Badge
                        variant="secondary"
                        className="h-5 bg-success/15 px-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-success hover:bg-success/15"
                      >
                        live
                      </Badge>
                    )}
                  </div>
                  {row.commitSubject && (
                    <div className="truncate text-[12px] italic text-foreground/70">
                      "{row.commitSubject}"
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="hidden text-right text-[11px] text-muted-foreground md:block">
                    <div className="flex items-center gap-1.5">
                      <GitCommit className="size-3" aria-hidden />
                      {formatShippedLabel(row.shippedAt)}
                    </div>
                  </div>
                  <ArrowUpRight
                    className="size-4 text-muted-foreground/60 transition group-hover:text-foreground"
                    aria-hidden
                  />
                </div>
              </button>
            </li>
          ))}
        </ol>
      )}

      {state.status === 'ready' &&
        rows.length > 0 &&
        (state.info.history ?? []).length === 0 && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            History tracking starts once{' '}
            <code className="font-mono">pipeline-info.json</code> carries a{' '}
            <code className="font-mono">history[]</code> array (pipeline-info
            schema v2). Until then, only the current deploy is shown.
          </p>
        )}
    </Card>
  );
}
