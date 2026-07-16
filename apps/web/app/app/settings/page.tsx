import { Database, KeyRound, Settings2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="label-caps text-primary">Settings</p>
        <h1 className="mt-2 font-display text-2xl font-bold">
          Platform controls
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review the trusted services and security boundaries for this
          workspace.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          [KeyRound, "Auth provider", "Supabase", "JWT verified by API"],
          [Database, "Database", "Alembic", "Schema changes tracked"],
          [Settings2, "Configuration", "Scoped", "Tenant-side controls"],
        ].map(([Icon, label, value, detail]) => {
          const StatusIcon = Icon as typeof KeyRound;
          return (
            <div
              className="rounded-card border bg-surface p-5 shadow-soft"
              key={String(label)}
            >
              <StatusIcon className="h-5 w-5 text-primary" />
              <p className="mt-5 text-xs font-semibold text-muted-foreground">
                {String(label)}
              </p>
              <p className="mt-1 font-display text-lg font-bold">
                {String(value)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {String(detail)}
              </p>
            </div>
          );
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border bg-surface p-5 shadow-soft">
          <h2 className="font-display text-sm font-bold">Environment</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Frontend</dt>
              <dd className="font-semibold">Vercel</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">API</dt>
              <dd className="font-semibold">FastAPI</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Worker</dt>
              <dd className="font-semibold">Dramatiq</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-card border bg-surface p-5 shadow-soft">
          <h2 className="font-display text-sm font-bold">Security boundary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Service-role key</dt>
              <dd className="font-semibold">Server only</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Client claims</dt>
              <dd className="font-semibold">Verified server-side</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Documents</dt>
              <dd className="font-semibold">Untrusted input</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
