import { Database, KeyRound, Settings2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusGrid } from "@/components/status-grid";

export default function SettingsPage() {
  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Settings" title="Platform controls" />
      <StatusGrid
        items={[
          {
            label: "Auth provider",
            value: "Supabase",
            detail: "JWT verified by API",
            icon: KeyRound
          },
          {
            label: "Database",
            value: "Alembic",
            detail: "Schema changes tracked",
            icon: Database
          },
          {
            label: "Configuration",
            value: "Scoped",
            detail: "Tenant-side controls",
            icon: Settings2
          }
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-white p-5">
          <h2 className="font-medium text-slate-950">Environment</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Frontend</dt>
              <dd className="font-medium text-slate-800">Vercel</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">API</dt>
              <dd className="font-medium text-slate-800">FastAPI</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Worker</dt>
              <dd className="font-medium text-slate-800">Dramatiq</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-md border border-border bg-white p-5">
          <h2 className="font-medium text-slate-950">Security boundary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Service-role key</dt>
              <dd className="font-medium text-slate-800">Server only</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Client claims</dt>
              <dd className="font-medium text-slate-800">Verified server-side</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Documents</dt>
              <dd className="font-medium text-slate-800">Untrusted input</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
