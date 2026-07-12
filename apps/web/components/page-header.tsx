import type { ReactNode } from "react";

export function PageHeader({
  title,
  eyebrow,
  children
}: {
  title: string;
  eyebrow?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-5">
      {eyebrow ? <p className="text-sm font-medium text-emerald-700">{eyebrow}</p> : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h1 className="text-3xl font-semibold text-slate-950">{title}</h1>
        {children}
      </div>
    </div>
  );
}
