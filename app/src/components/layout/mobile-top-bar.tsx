import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { LangToggle } from '@/components/lang-toggle';
import { ModeToggle } from '@/components/mode-toggle';
import { ProveItTrigger } from '@/components/provenance/prove-it-drawer';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ProjectNav } from '@/features/resume/components/project-nav';

export function MobileTopBar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const handleNavClick = () => setOpen(false);

  return (
    <div className="sticky top-0 z-40 flex h-12 items-center justify-between gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md xl:hidden">
      <div className="flex items-center gap-1">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="ナビゲーションを開く"
              aria-expanded={open}
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] gap-0 p-0">
            <SheetHeader className="border-b px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Goshuukai
              </div>
              <SheetTitle className="text-lg font-semibold tracking-tight">
                面接準備ブートキャンプ
              </SheetTitle>
              <SheetDescription className="text-[13px] leading-6">
                履歴書 5 案件 + 共通 229 問デッキ
              </SheetDescription>
            </SheetHeader>
            <div
              className="flex flex-col gap-4 overflow-y-auto p-4"
              onClick={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest('a[href]')) {
                  handleNavClick();
                }
              }}
            >
              <ProjectNav key={location.pathname} />
            </div>
          </SheetContent>
        </Sheet>
        <Link
          to="/"
          className="ml-1 text-sm font-semibold tracking-tight"
          aria-label="ホームへ戻る"
        >
          面接準備BC
        </Link>
      </div>
      <div className="flex items-center gap-1">
        <ProveItTrigger variant="icon" />
        <LangToggle />
        <ModeToggle />
      </div>
    </div>
  );
}
