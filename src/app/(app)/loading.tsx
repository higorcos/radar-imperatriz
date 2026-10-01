export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="space-y-4">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-surface-2" />
      <div className="h-4 w-96 max-w-full animate-pulse rounded bg-surface-2" />
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-xl bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
