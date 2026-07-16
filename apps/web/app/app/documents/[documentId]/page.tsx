import { DocumentDetailWorkspace } from "@/components/documents/document-detail-workspace";

export default function DocumentDetailPage({
  params,
  searchParams,
}: {
  params: { documentId: string };
  searchParams: { download?: string };
}) {
  return (
    <DocumentDetailWorkspace
      autoDownload={searchParams.download === "true"}
      documentId={params.documentId}
    />
  );
}
