import { domains } from "@/lib/foundation-data";

export function DomainList() {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-white">
      <div className="grid grid-cols-[1fr_auto] border-b border-border px-4 py-3 text-sm font-medium text-slate-700">
        <span>Domain</span>
        <span>Status</span>
      </div>
      {domains.map((domain) => (
        <div
          className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-4 py-4 last:border-b-0"
          key={domain.slug}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-800">
              <domain.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-slate-950">{domain.name}</p>
              <p className="text-sm text-muted-foreground">{domain.description}</p>
            </div>
          </div>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-sm text-slate-700">
            {domain.status}
          </span>
        </div>
      ))}
    </div>
  );
}
