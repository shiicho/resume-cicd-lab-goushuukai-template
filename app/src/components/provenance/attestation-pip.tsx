import type { ComponentPropsWithoutRef } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type AttestationKind = 'attested' | 'imagined';

interface AttestationPipProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  kind: AttestationKind;
  size?: 'sm' | 'md';
  label?: string;
  hideTooltip?: boolean;
}

const COPY: Record<AttestationKind, { short: string; long: string; glyph: string }> = {
  attested: {
    short: 'Attested',
    long: '職務経歴書 + CI/CD pipeline-info で裏取りできる要素です。',
    glyph: '●',
  },
  imagined: {
    short: 'Imagined',
    long: '職務経歴書には明示されていないが、業界標準として補った要素です。',
    glyph: '◐',
  },
};

export function AttestationPip({
  kind,
  size = 'sm',
  label,
  hideTooltip,
  className,
  ...rest
}: AttestationPipProps) {
  const copy = COPY[kind];
  const sizeClass = size === 'md' ? 'size-5 text-[11px]' : 'size-4 text-[10px]';

  const content = (
    <span
      role="img"
      aria-label={`${copy.short}: ${label ?? copy.long}`}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border font-semibold leading-none transition-colors',
        sizeClass,
        kind === 'attested'
          ? 'border-success/40 bg-success/15 text-success'
          : 'border-border bg-muted text-muted-foreground',
        className,
      )}
      {...rest}
    >
      <span aria-hidden="true">{copy.glyph}</span>
    </span>
  );

  if (hideTooltip) return content;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px] px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">
            {copy.short}
          </div>
          <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
            {label ?? copy.long}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
