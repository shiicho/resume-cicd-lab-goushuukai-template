import { Check, Languages } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type Lang = 'ja' | 'en' | 'zh';

interface LangOption {
  value: Lang;
  label: string;
  hint: string;
  docLang: string;
}

const OPTIONS: LangOption[] = [
  { value: 'ja', label: '日本語', hint: 'JP · default', docLang: 'ja' },
  { value: 'en', label: 'English', hint: 'EN · scaffold', docLang: 'en' },
  { value: 'zh', label: '简体中文', hint: 'ZH-CN · scaffold', docLang: 'zh-CN' },
];

const STORAGE_KEY = 'resume-lang';

function readLang(): Lang {
  if (typeof window === 'undefined') return 'ja';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'ja' || raw === 'en' || raw === 'zh') return raw;
  } catch {
    /* storage denied */
  }
  return 'ja';
}

function writeLang(lang: Lang) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* storage denied */
  }
}

function applyDocLang(lang: Lang) {
  const match = OPTIONS.find((opt) => opt.value === lang);
  if (match && typeof document !== 'undefined') {
    document.documentElement.lang = match.docLang;
  }
}

export function LangToggle() {
  const [lang, setLang] = useState<Lang>('ja');

  useEffect(() => {
    const stored = readLang();
    setLang(stored);
    applyDocLang(stored);
  }, []);

  const handlePick = (next: Lang) => {
    setLang(next);
    writeLang(next);
    applyDocLang(next);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="言語を切り替える"
          aria-haspopup="menu"
        >
          <Languages />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Language
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onSelect={() => handlePick(opt.value)}
            className="gap-2"
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <span>{opt.label}</span>
              <span className="text-[10px] text-muted-foreground">
                {opt.hint}
              </span>
            </div>
            {opt.value === lang && (
              <Check className="size-4 text-success" aria-label="selected" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[10px] leading-4 text-muted-foreground">
          UI は現在 JP 固定 (i18n 抽出は次フェーズ)。選択は lang
          属性と localStorage に保存。
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
