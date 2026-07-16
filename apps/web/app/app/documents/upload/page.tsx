import { UploadWorkspace } from "@/components/documents/upload-workspace";

export default function UploadDocumentsPage() {
  return (
    <section className="space-y-5">
      <header>
        <p className="label-caps text-primary">Upload documents</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold">
          Add a searchable record
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a file and confirm its document name. Processing is automatic.
        </p>
      </header>
      <UploadWorkspace />
    </section>
  );
}
