import Link from "next/link";
import { ArrowRight, Database, LockKeyhole, Network } from "lucide-react";

import { ApiHealth } from "@/components/api-health";
import { Button } from "@/components/ui/button";
import { StatusGrid } from "@/components/status-grid";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-8 px-6 py-10">
      <div className="space-y-4">
        <p className="text-sm font-medium text-emerald-700">Phase 1 foundation</p>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-normal text-slate-950">
          Company Brain
        </h1>
        <p className="max-w-2xl text-lg text-slate-700">
          A scoped business intelligence workspace for authorized organizations, businesses,
          domains, and cited knowledge.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link href="/app">
            Open app <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Login</Link>
        </Button>
        <ApiHealth />
      </div>
      <StatusGrid
        items={[
          {
            label: "Backend boundary",
            value: "FastAPI",
            detail: "Trusted authorization layer",
            icon: LockKeyhole
          },
          {
            label: "Data layer",
            value: "Supabase",
            detail: "PostgreSQL, Auth, Storage",
            icon: Database
          },
          {
            label: "Business scope",
            value: "Tenant aware",
            detail: "Organization, business, domain",
            icon: Network
          }
        ]}
      />
    </main>
  );
}
