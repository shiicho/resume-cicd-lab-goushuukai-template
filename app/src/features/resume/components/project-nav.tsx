import { NavLink } from 'react-router-dom';

import { generalQaBank } from '@/features/resume/data/general-qa';
import { getProjectQa } from '@/features/resume/data/project-qa';
import { resumeProjects } from '@/features/resume/data/resume-projects';
import { useDeckProgress } from '@/features/resume/lib/use-deck-progress';
import { cn } from '@/lib/utils';

function Badge({ mastered, total }: { mastered: number; total: number }) {
  if (total === 0) return null;
  const pct = Math.round((mastered / total) * 100);
  const complete = mastered === total;
  return (
    <span
      className={cn(
        'ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums',
        complete
          ? 'bg-success/15 text-success'
          : mastered > 0
            ? 'bg-primary/15 text-primary'
            : 'bg-muted text-muted-foreground',
      )}
      title={`${pct}% mastered`}
    >
      {mastered}/{total}
    </span>
  );
}

function ProjectLink({
  project,
  mobile,
}: {
  project: (typeof resumeProjects)[number];
  mobile?: boolean;
}) {
  const total = getProjectQa(project.id).length;
  const progress = useDeckProgress(`project-${project.id}`);
  return (
    <NavLink
      to={`/projects/${project.slug}`}
      className={({ isActive }) =>
        cn(
          'inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition',
          mobile ? 'whitespace-nowrap' : 'justify-between',
          isActive
            ? 'border-primary bg-primary/10 text-primary'
            : 'border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
        )
      }
    >
      <span className="flex items-center gap-2">
        <span className="font-semibold">{project.code}</span>
        <span className={cn('text-xs', mobile ? 'text-inherit' : 'text-muted-foreground/70')}>
          {project.shortTitle}
        </span>
      </span>
      {!mobile ? <Badge mastered={progress.mastered} total={total} /> : null}
    </NavLink>
  );
}

function InterviewPrepLink({ mobile }: { mobile?: boolean }) {
  const total = generalQaBank.length;
  const progress = useDeckProgress('general-interview');
  return (
    <NavLink
      to="/interview-prep"
      className={({ isActive }) =>
        cn(
          'inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition',
          mobile ? 'whitespace-nowrap' : 'justify-between',
          isActive
            ? 'border-success bg-success/15 text-success'
            : 'border-success/40 bg-success/10 text-success hover:border-success/60 hover:bg-success/15',
        )
      }
    >
      <span className="flex items-center gap-2">
        <span aria-hidden>◇</span>
        <span className="font-semibold">Interview Prep</span>
      </span>
      {!mobile ? <Badge mastered={progress.mastered} total={total} /> : null}
    </NavLink>
  );
}

export function ProjectNav({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav className={cn('flex gap-2', mobile ? 'overflow-x-auto pb-1' : 'flex-col')}>
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          cn(
            'inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition',
            mobile ? 'whitespace-nowrap' : 'justify-between',
            isActive
              ? 'border-primary bg-primary/10 text-primary'
              : 'border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
          )
        }
      >
        <span className="font-semibold">Overview</span>
        {!mobile ? <span className="text-xs text-muted-foreground/70">5 projects</span> : null}
      </NavLink>

      {!mobile ? (
        <div className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
          Projects
        </div>
      ) : null}
      {resumeProjects.map((project) => (
        <ProjectLink key={project.id} project={project} mobile={mobile} />
      ))}

      {!mobile ? (
        <div className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
          General study
        </div>
      ) : null}
      <InterviewPrepLink mobile={mobile} />
    </nav>
  );
}
