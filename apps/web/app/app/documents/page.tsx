import { FileCheck2, FileText, LockKeyhole } from "lucide-react";

import { DocumentUploadWorkspace } from "@/components/document-upload-workspace";
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
            icon: LockKeyhole,
          },
          {
            label: "Extraction",
            value: "Queued",
            detail: "Worker boundary",
            icon: FileText,
          },
          {
            label: "Publication",
            value: "Reviewed",
            detail: "Evidence before answers",
            icon: FileCheck2,
          },
        ]}
      />
      <DocumentUploadWorkspace />
    </section>
  );
}
