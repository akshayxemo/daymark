export default function Loading() {
  return (
    <div className="skeleton-list" aria-busy="true" aria-label="Loading">
      <div className="skeleton-row" />
      <div className="skeleton-row" />
      <div className="skeleton-row" />
    </div>
  );
}
