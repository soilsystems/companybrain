import { MessageSquare, ShieldCheck, SquareDashedMousePointer } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusGrid } from "@/components/status-grid";

export default function ChatPage() {
  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Chat" title="Domain-scoped assistant" />
      <StatusGrid
        items={[
          {
            label: "Scope resolver",
            value: "Required",
            detail: "Organization, business, domain",
            icon: ShieldCheck
          },
          {
            label: "Tool access",
            value: "Predefined",
            detail: "No arbitrary SQL",
            icon: SquareDashedMousePointer
          },
          {
            label: "Answer status",
            value: "Explicit",
            detail: "Answered, partial, not found",
            icon: MessageSquare
          }
        ]}
      />
      <div className="rounded-md border border-border bg-white p-5">
        <div className="min-h-80 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Assistant workspace</p>
          <div className="mt-6 max-w-xl rounded-md bg-white p-4 text-sm text-slate-700 shadow-sm">
            Select an enabled domain before asking a business question.
          </div>
        </div>
      </div>
    </section>
  );
}
