import { Building2, ChevronDown, Factory, ShieldCheck } from "lucide-react";

import { workspace } from "@/lib/foundation-data";

export function ScopeSelector() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-md border border-border bg-white p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          Organization
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="font-medium text-slate-950">{workspace.organization}</p>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </div>
      </div>
      <div className="rounded-md border border-border bg-white p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Factory className="h-4 w-4" />
          Business
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="font-medium text-slate-950">{workspace.business}</p>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </div>
      </div>
      <div className="rounded-md border border-border bg-white p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          Access
        </div>
        <p className="mt-3 font-medium text-slate-950">{workspace.role}</p>
      </div>
    </div>
  );
}
