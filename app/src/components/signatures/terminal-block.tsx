import { cn } from '@/lib/utils';

type TerminalBlockProps = {
  content: string;
  title?: string;
  className?: string;
};

const PROMPT_LINE = /^[\s]*[$>#][ \t]/;
const SUCCESS_LINE = /^(Verified OK|Plan:.+to add.+to change.+to destroy|Apply complete!)/;
const WARNING_LINE = /^(Warning[:!]|⚠|!\s)/i;
const ERROR_LINE = /^(Error[:!]|✗ |FAIL|E\d{4}:)/i;

export function isTerminalAnswer(answer: string): boolean {
  const lines = answer.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return false;
  const first = lines[0];
  if (first.startsWith('$ ') || first.startsWith('$\t') || first.startsWith('> ')) return true;
  const promptCount = lines.filter((l) => PROMPT_LINE.test(l)).length;
  return promptCount >= 2;
}

export function TerminalBlock({
  content,
  title = 'terminal',
  className,
}: TerminalBlockProps) {
  const lines = content.split('\n');
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-terminal-bg font-mono text-[13px] leading-6 text-terminal-fg shadow-sm',
        className,
      )}
      role="group"
      aria-label="コマンドライン出力"
    >
      <div className="flex items-center gap-1.5 border-b bg-background/40 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-terminal-dim">
        <span className="inline-block size-2 rounded-full bg-destructive/70" aria-hidden />
        <span className="inline-block size-2 rounded-full bg-warning/70" aria-hidden />
        <span className="inline-block size-2 rounded-full bg-success/70" aria-hidden />
        <span className="ml-2">{title}</span>
      </div>
      <pre className="overflow-auto px-4 py-3">
        <code className="block whitespace-pre-wrap">
          {lines.map((line, i) => (
            <TerminalLine key={i} line={line} />
          ))}
        </code>
      </pre>
    </div>
  );
}

function TerminalLine({ line }: { line: string }) {
  const trailingNewline = '\n';

  if (PROMPT_LINE.test(line)) {
    const indent = line.match(/^\s*/)?.[0] ?? '';
    const prompt = line.trim().charAt(0);
    const rest = line.trim().slice(1);
    return (
      <span className="block">
        {indent}
        <span className="text-terminal-accent">{prompt}</span>
        {rest}
        {trailingNewline}
      </span>
    );
  }

  if (SUCCESS_LINE.test(line)) {
    return (
      <span className="block text-success">
        {line}
        {trailingNewline}
      </span>
    );
  }

  if (WARNING_LINE.test(line)) {
    return (
      <span className="block text-warning">
        {line}
        {trailingNewline}
      </span>
    );
  }

  if (ERROR_LINE.test(line)) {
    return (
      <span className="block text-destructive">
        {line}
        {trailingNewline}
      </span>
    );
  }

  return (
    <span className="block">
      {line}
      {trailingNewline}
    </span>
  );
}
