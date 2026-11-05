'use client';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjects, useTasks } from '@/lib/api/queries';
import { useApp, useStatusHelpers } from '../context';
import { TaskTable } from '../cards';
import { ErrorNote, SectionHead } from '../shared';

const PAGE = 50;

export function TasksPage() {
  const app = useApp();
  const helpers = useStatusHelpers();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [state, setState] = useState('open');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [projectId, setProjectId] = useState('');
  const [tagId, setTagId] = useState('');
  const [sort, setSort] = useState('updated');
  const [page, setPage] = useState({ key: '', offset: 0 });
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);
  // Changing any filter starts again from the first page.
  const filterKey = JSON.stringify([
    debounced,
    state,
    category,
    priority,
    projectId,
    tagId,
    sort,
    app.workspaceId,
  ]);
  const offset = page.key === filterKey ? page.offset : 0;
  const setOffset = (value: number) => setPage({ key: filterKey, offset: value });
  const projects = useProjects({ workspaceId: app.workspaceId });
  const tags = app.workspaceId ? helpers.tagsFor(app.workspaceId) : app.configuration.tags;
  const query = {
    workspaceId: app.workspaceId,
    search: debounced || undefined,
    completed: state === 'open' ? false : state === 'completed' ? true : undefined,
    includeArchived: state === 'archived' ? true : undefined,
    statusCategory: category || undefined,
    priority: priority || undefined,
    projectId: projectId || undefined,
    tagId: tagId || undefined,
    sort,
    order: sort === 'title' || sort === 'planned' || sort === 'due' ? 'asc' : 'desc',
    limit: PAGE,
    offset,
  };
  const tasks = useTasks(query);
  const items = (tasks.data?.items ?? []).filter((t) =>
    state === 'archived' ? Boolean(t.archivedAt) : true,
  );
  const total = tasks.data?.total ?? 0;
  return (
    <section className="card task-card">
      <SectionHead
        title="All your tasks"
        subtitle={`${total} task${total === 1 ? '' : 's'} match these filters`}
        action={
          <Button size="sm" onClick={() => app.openCreate({ plannedDate: null })}>
            <Plus size={14} />
            Add task
          </Button>
        }
      />
      <div className="toolbar-row" role="search">
        <input
          type="search"
          placeholder="Search title, description or DM-number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search tasks"
        />
        <select value={state} onChange={(e) => setState(e.target.value)} aria-label="Completion">
          <option value="open">Open</option>
          <option value="completed">Completed</option>
          <option value="all">All</option>
          <option value="archived">Including archived</option>
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Status category"
        >
          <option value="">Any status</option>
          <option value="not_started">Not started</option>
          <option value="active">Active</option>
          <option value="paused">On hold</option>
          <option value="waiting">Blocked</option>
          <option value="done">Done</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          aria-label="Priority"
        >
          <option value="">Any priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          aria-label="Project"
        >
          <option value="">Any project</option>
          {(projects.data ?? []).map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        {tags.length > 0 && (
          <select value={tagId} onChange={(e) => setTagId(e.target.value)} aria-label="Tag">
            <option value="">Any tag</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                #{tag.name}
              </option>
            ))}
          </select>
        )}
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
          <option value="updated">Recently updated</option>
          <option value="created">Newest</option>
          <option value="planned">Planned date</option>
          <option value="due">Due date</option>
          <option value="priority">Priority</option>
          <option value="title">Title</option>
          <option value="number">Task number</option>
        </select>
      </div>
      <ErrorNote error={tasks.error} />
      <TaskTable
        tasks={items}
        empty={debounced ? 'No tasks match your search.' : 'A clear space for your next step.'}
      />
      {total > PAGE && (
        <div className="pager">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE))}
          >
            Previous
          </Button>
          <span>
            {offset + 1}–{Math.min(offset + PAGE, total)} of {total}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={offset + PAGE >= total}
            onClick={() => setOffset(offset + PAGE)}
          >
            Next
          </Button>
        </div>
      )}
    </section>
  );
}
