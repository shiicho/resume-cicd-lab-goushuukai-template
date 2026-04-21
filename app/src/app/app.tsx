import { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom';

import { KeyboardHelpOverlay } from '@/components/keyboard-help-overlay';
import { PipelineBanner } from '@/components/PipelineBanner';
import { MobileTopBar } from '@/components/layout/mobile-top-bar';
import { Sidebar } from '@/components/layout/sidebar';
import { getProjectBySlug } from '@/features/resume/data/resume-projects';
import { HomePage } from '@/features/resume/pages/home-page';
import { InterviewPrepPage } from '@/features/resume/pages/interview-prep-page';
import { ProjectPage } from '@/features/resume/pages/project-page';

function RouteTitleSync() {
  const location = useLocation();
  const slug = location.pathname.startsWith('/projects/')
    ? location.pathname.replace('/projects/', '')
    : null;
  const project = slug ? getProjectBySlug(slug) : null;
  const isInterviewPrep = location.pathname === '/interview-prep';

  useEffect(() => {
    if (project) {
      document.title = `${project.code} ${project.shortTitle} | Goshuukai Interview Prep`;
    } else if (isInterviewPrep) {
      document.title = '共通 Q&A 229 題 | Goshuukai Interview Prep';
    } else {
      document.title = 'Goshuukai Interview Prep';
    }
  }, [project, isInterviewPrep]);

  return null;
}

function ProjectRoute() {
  const { slug } = useParams<{ slug: string }>();
  const project = slug ? getProjectBySlug(slug) : undefined;

  if (!project) {
    return <Navigate to="/" replace />;
  }

  return <ProjectPage project={project} />;
}

function AppFrame() {
  return (
    <div className="min-h-screen bg-background pb-20 text-foreground">
      <MobileTopBar />
      <div className="mx-auto flex w-full max-w-[1720px] gap-6 px-4 py-4 xl:gap-8 xl:px-6">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <RouteTitleSync />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/projects/:slug" element={<ProjectRoute />} />
            <Route path="/interview-prep" element={<InterviewPrepPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <KeyboardHelpOverlay />
      <PipelineBanner />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppFrame />
    </BrowserRouter>
  );
}
