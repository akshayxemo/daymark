'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from './context';

/** Colored workspace pill. Colors map to the workspace's configured color token. */
export function WorkspaceTag({
  workspaceId,
  name,
}: {
  workspaceId?: string | null;
  name?: string;
}) {
  const { workspaceById } = useApp();
  const workspace = workspaceById(workspaceId);
  const label = name ?? workspace?.name ?? 'All workspaces';
  const color = workspace?.color ?? 'muted';
  return (
    <span className={`workspace-tag color-${color}`}>
      <span />
      {label}
    </span>
  );
}

export function SectionHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
  drawer = false,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  drawer?: boolean;
  wide?: boolean;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`modal ${drawer ? 'drawer' : ''} ${wide ? 'wide' : ''}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
          <X size={19} />
        </Button>
      </div>
      {children}
    </dialog>
  );
}

export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <p>{children}</p>
      {action}
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <p className="project-error" role="alert">
      {message}
    </p>
  );
}

export function LoadingRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skeleton-list" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton-row" key={i} />
      ))}
    </div>
  );
}

export function PriorityPill({ priority }: { priority: string }) {
  return (
    <span className={`priority ${priority}`}>
      <span />
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}
