import type { ComponentType } from "react";

export function StatusGrid({
  items
}: {
  items: Array<{
    label: string;
    value: string;
    detail?: string;
    icon?: ComponentType<{ className?: string }>;
  }>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div className="rounded-md border border-border bg-white p-4" key={item.label}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              {Icon ? <Icon className="h-4 w-4 text-emerald-700" /> : null}
            </div>
            <p className="mt-3 text-xl font-semibold text-slate-950">{item.value}</p>
            {item.detail ? <p className="mt-1 text-sm text-slate-600">{item.detail}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
