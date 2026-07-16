"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Download,
  ExternalLink,
  FileQuestion,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  ErrorState,
  LoadingSkeleton,
  ProcessingBadge,
  SurveyNumberBadge,
} from "@/components/documents/document-ui";
import {
  createDocumentUrl,
  getDocument,
  type DocumentDetail,
} from "@/lib/api-client";

export function DocumentDetailWorkspace({
  documentId,
  autoDownload = false,
}: {
  documentId: string;
  autoDownload?: boolean;
}) {
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [viewUrl, setViewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getDocument(documentId)
      .then(setDocument)
      .catch((caught: Error) => setError(caught.message))
      .finally(() => setLoading(false));
  }, [documentId]);

  const openAction = useCallback(async (action: "view" | "download") => {
    try {
      const signed = await createDocumentUrl(documentId, action);
      if (action === "view") setViewUrl(signed.url);
      else window.location.assign(signed.url);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The document file is unavailable.",
      );
    }
  }, [documentId]);

  useEffect(() => {
    if (autoDownload && document) void openAction("download");
  }, [autoDownload, document, openAction]);

  useEffect(() => {
    if (document && !autoDownload && document.normalized_mime_type) {
      void openAction("view");
    }
  }, [autoDownload, document, openAction]);

  if (loading)
    return (
      <div className="surface rounded-panel">
        <LoadingSkeleton />
      </div>
    );
  if (error && !document) return <ErrorState message={error} />;
  if (!document) return null;
  const survey = document.identifiers.find(
    (item) => item.type === "survey_number",
  )?.value;
  const isImage = document.normalized_mime_type?.startsWith("image/");
  const isPdf = document.normalized_mime_type === "application/pdf";
  const isText = ["text/plain", "text/csv", "application/json"].includes(
    document.normalized_mime_type ?? "",
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="surface min-h-[650px] overflow-hidden rounded-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-surface-muted px-5 py-4">
          <div>
            <h1 className="font-display text-base font-bold">
              {document.title}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {document.original_filename}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="inline-flex h-9 items-center gap-2 rounded-base border bg-surface px-3 text-xs font-bold"
              onClick={() => openAction("view")}
              type="button"
            >
              <ExternalLink className="h-4 w-4" /> Open preview
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-base bg-foreground px-3 text-xs font-bold text-background hover:bg-primary hover:text-white"
              onClick={() => openAction("download")}
              type="button"
            >
              <Download className="h-4 w-4" /> Download
            </button>
          </div>
        </div>
        <div className="flex min-h-[590px] items-center justify-center bg-surface-muted/60 p-5">
          {viewUrl && isPdf ? (
            <iframe
              className="h-[570px] w-full rounded-base border bg-white"
              src={viewUrl}
              title={document.title}
            />
          ) : null}
          {viewUrl && isImage ? (
            <Image
              alt={document.title}
              className="max-h-[570px] max-w-full rounded-base object-contain shadow-soft"
              height={900}
              src={viewUrl}
              unoptimized
              width={1200}
            />
          ) : null}
          {viewUrl && isText ? (
            <iframe
              className="h-[570px] w-full rounded-base border bg-white"
              sandbox=""
              src={viewUrl}
              title={document.title}
            />
          ) : null}
          {!viewUrl ? (
            <div className="max-w-md text-center">
              <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="mt-4 font-display text-base font-bold">
                Secure preview is loading
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The document will appear here after access is authorized.
              </p>
              <button
                className="mt-5 rounded-base bg-foreground px-4 py-2.5 text-xs font-bold text-background hover:bg-primary hover:text-white"
                onClick={() => openAction("view")}
                type="button"
              >
                Load secure preview
              </button>
            </div>
          ) : null}
        </div>
      </section>
      <aside className="space-y-4">
        <div className="surface rounded-panel p-5">
          <div className="label-caps mb-4">Document metadata</div>
          {survey ? <SurveyNumberBadge value={survey} /> : null}
          <dl className="mt-5 space-y-3 text-xs">
            {[
              ["Category", document.category],
              ["Type", document.document_type],
              ["Owner", document.party_owner],
              ["Location", document.location],
              ["Document date", document.document_date],
              ["Version", `v${document.version_number}`],
            ].map(([label, value]) =>
              value ? (
                <div className="flex justify-between gap-4" key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-semibold">{value}</dd>
                </div>
              ) : null,
            )}
          </dl>
          <div className="mt-5 border-t pt-4">
            <ProcessingBadge status={document.processing_status} />
          </div>
        </div>
        <div className="surface rounded-panel p-5">
          <div className="label-caps mb-4">Access and source</div>
          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />{" "}
            Private original. View and download requests are authorized and
            audited.
          </p>
        </div>
        <Link
          className="flex h-11 items-center justify-center gap-2 rounded-base bg-primary px-4 text-sm font-bold text-white"
          href={`/app/chat?documentId=${document.document_id}`}
        >
          <MessageSquare className="h-4 w-4" /> Ask this document
        </Link>
        {error ? (
          <p className="rounded-base border border-destructive/30 bg-destructive-muted p-3 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
