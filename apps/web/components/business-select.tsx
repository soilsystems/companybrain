"use client";

import { Building2 } from "lucide-react";

import { businesses } from "@/lib/foundation-data";

export function BusinessSelect({
  value,
  onChange,
  label = "Business",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
        <Building2 className="h-4 w-4" />
        {label}
      </span>
      <select
        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {businesses.map((business) => (
          <option key={business.id} value={business.id}>
            {business.name}
          </option>
        ))}
      </select>
    </label>
  );
}
