'use client';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, FolderKanban, ListTodo, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { ProjectSummary, TaskSummary } from '@/lib/api/types';
import { appSections, settingsSections } from '@/lib/app-routes';
import { useApp } from './context';
import { Modal, WorkspaceTag } from './shared';

export function SearchPalette() {
  const app = useApp();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 180);
    return () => clearTimeout(id);
  }, [query]);
  const results = useQuery<{ tasks: TaskSummary[]; projects: ProjectSummary[] }>({
    queryKey: ['search', debounced],
    queryFn: () => api.get('/search', { q: debounced }),
    enabled: debounced.length > 0,
    staleTime: 30_000,
  });
  const close = () => {
    app.setSearchOpen(false);
    setQuery('');
  };
  const pages = [...appSections, ...settingsSections].filter((page) =>
    page.name.toLowerCase().includes(query.toLowerCase()),
  );
  const tasks = debounced ? (results.data?.tasks ?? []) : [];
  const projects = debounced ? (results.data?.projects ?? []) : [];
  const empty =
    debounced && !results.isLoading && !tasks.length && !projects.length && !pages.length;

  return (
    <Modal title="Find a little clarity" onClose={close}>
      <div className="global-search">
        <Search size={19} />
        <input
          autoFocus
          aria-label="Search tasks, projects and pages"
          placeholder="Search tasks, projects, or pages…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <kbd>ESC</kbd>
      </div>
      <div className="search-results">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => {
              app.openTask(task.id);
              close();
            }}
          >
            <ListTodo size={17} />
            <div>
              <strong>{task.title}</strong>
              <span>
                {task.reference} · {task.projectName ?? 'No project'} ·{' '}
                <WorkspaceTag workspaceId={task.workspaceId} />
              </span>
            </div>
            <ArrowUpRight size={14} />
          </button>
        ))}
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => {
              router.push('/app/projects');
              close();
            }}
          >
            <FolderKanban size={17} />
            <div>
              <strong>{project.name}</strong>
              <span>Project · {project.taskCount} tasks</span>
            </div>
            <ArrowRight size={14} />
          </button>
        ))}
        {pages.map((page) => (
          <button
            key={page.path}
            onClick={() => {
              router.push(page.path);
              close();
            }}
          >
            <ArrowRight size={17} />
            <div>
              <strong>{page.name}</strong>
              <span>Go to page</span>
            </div>
            <ArrowRight size={14} />
          </button>
        ))}
        {empty && <div className="empty">No matches. Try another word or create a task.</div>}
      </div>
    </Modal>
  );
}
