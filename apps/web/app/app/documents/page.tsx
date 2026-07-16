import { DocumentLibrary } from "@/components/documents/document-library";

export default function DocumentsPage() {
  return (
    <section className="space-y-5">
      <header>
        <p className="label-caps text-primary">Document library</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold">
          Business records
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          View, filter, download, and ask questions about authorized documents.
        </p>
      </header>
      <DocumentLibrary />
    </section>
  );
}
