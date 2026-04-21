import { Fragment } from 'react';

type GitLogStripProps = {
  code: string;
  period?: string;
  label?: string;
  role?: string;
  team?: string;
  className?: string;
};

export function GitLogStrip({
  code,
  period,
  label,
  role,
  team,
  className,
}: GitLogStripProps) {
  const segments = [
    code,
    period,
    label,
    role ? `role ${role}` : null,
    team ? `team ${team}` : null,
  ].filter((segment): segment is string => Boolean(segment));

  return (
    <div
      className={[
        'flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[13px] leading-6 text-foreground/80',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="プロジェクトメタ情報"
    >
      <span className="text-primary" aria-hidden>
        ▸
      </span>
      {segments.map((seg, i) => (
        <Fragment key={i}>
          <span className="whitespace-nowrap">{seg}</span>
          {i < segments.length - 1 ? (
            <span className="text-muted-foreground" aria-hidden>
              ·
            </span>
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
