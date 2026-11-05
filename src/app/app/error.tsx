'use client';
import { Button } from '@/components/ui/button';

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="card">
      <h2>Something went wrong</h2>
      <p className="detail-hint">
        This page could not be loaded. Your data is safe; try again in a moment.
      </p>
      <Button onClick={reset}>Try again</Button>
    </section>
  );
}
