import { FileCheck2, FileText, LockKeyhole } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusGrid } from "@/components/status-grid";

export default function DocumentsPage() {
  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Documents" title="Business knowledge intake" />
      <StatusGrid
        items={[
          {
            label: "Storage",
            value: "Private",
            detail: "Signed access only",
            icon: LockKeyhole
          },
          {
            label: "Extraction",
            value: "Queued",
            detail: "Worker boundary",
            icon: FileText
          },
          {
            label: "Publication",
            value: "Reviewed",
            detail: "Evidence before answers",
            icon: FileCheck2
          }
        ]}
      />
      <div className="rounded-md border border-border bg-white p-5">
        <div className="flex min-h-64 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
          <div>
            <p className="font-medium text-slate-950">Document upload surface</p>
            <p className="mt-2 text-sm text-slate-600">PDF, DOCX, XLSX, CSV, TXT, PNG, JPEG</p>
          </div>
        </div>
      </div>
    </section>
  );
}
