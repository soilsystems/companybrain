"use client";

import Link from "next/link";
import { Download, Eye, Filter, MessageSquare, Upload } from "lucide-react";
import { useEffect, useState } from "react";

import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  ProcessingBadge,
  SurveyNumberBadge,
} from "@/components/documents/document-ui";
import { useScope } from "@/components/scope-context";
import { apiFetch, type DocumentSearchResponse } from "@/lib/api-client";

export function DocumentLibrary() {
  const {
    business,
    domainId,
    loading: scopeLoading,
    error: scopeError,
  } = useScope();
  const [data, setData] = useState<DocumentSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [processingStatus, setProcessingStatus] = useState("");
  const [page, setPage] = useState(1);

  function load() {
    if (!business) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      business_id: business.id,
      page: String(page),
      page_size: "25",
    });
    if (domainId) params.set("domain_id", domainId);
    if (category) params.set("category", category);
    if (processingStatus) params.set("processing_status", processingStatus);
    apiFetch<DocumentSearchResponse>(`/api/v1/documents?${params}`)
      .then(setData)
      .catch((caught: Error) => setError(caught.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [business, category, domainId, page, processingStatus]);

  return (
    <div className="surface overflow-hidden rounded-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-surface-muted px-5 py-4">
        <div>
          <h2 className="font-display text-sm font-bold">Document library</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {data
              ? `${data.total} authorized documents`
              : "Authorized records in this workspace"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-base border bg-surface px-3 text-xs font-bold"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((value) => !value)}
            type="button"
          >
            <Filter className="h-4 w-4" /> Filters
          </button>
          <Link
            className="inline-flex h-9 items-center gap-2 rounded-base bg-foreground px-3 text-xs font-bold text-background hover:bg-primary hover:text-white"
            href="/app/documents/upload"
          >
            <Upload className="h-4 w-4" /> Upload
          </Link>
        </div>
      </div>
      {filtersOpen ? (
        <div className="grid gap-3 border-b bg-surface px-5 py-4 sm:grid-cols-2">
          <input
            aria-label="Category filter"
            className="h-9 rounded-base border bg-surface-muted px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
            placeholder="Filter by category"
            value={category}
          />
          <select
            aria-label="Processing status filter"
            className="h-9 rounded-base border bg-surface-muted px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
            onChange={(event) => {
              setProcessingStatus(event.target.value);
              setPage(1);
            }}
            value={processingStatus}
          >
            <option value="">Any processing status</option>
            {[
              "uploaded",
              "queued",
              "extracting",
              "chunking",
              "embedding",
              "ready",
              "failed",
            ].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {scopeLoading || loading ? <LoadingSkeleton /> : null}
      {!scopeLoading && !business ? (
        <div className="p-5">
          <ErrorState
            message={scopeError || "Choose an authorized workspace."}
          />
        </div>
      ) : null}
      {error ? (
        <div className="p-5">
          <ErrorState message={error} retry={load} />
        </div>
      ) : null}
      {!loading && data?.results.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="border-b bg-surface-muted text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-bold">Survey</th>
                <th className="px-4 py-3 font-bold">Document</th>
                <th className="px-4 py-3 font-bold">Category</th>
                <th className="px-4 py-3 font-bold">Updated</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-5 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.results.map((document) => (
                <tr
                  className="hover:bg-surface-muted/70"
                  key={document.document_id}
                >
                  <td className="px-5 py-4">
                    {document.survey_number ? (
                      <SurveyNumberBadge value={document.survey_number} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      className="font-bold hover:text-primary"
                      href={`/app/documents/${document.document_id}`}
                    >
                      {document.title}
                    </Link>
                    <p className="mt-1 max-w-xs truncate text-muted-foreground">
                      {document.original_filename}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {document.category ?? "Uncategorized"}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {new Date(document.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <ProcessingBadge status={document.processing_status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <Link
                        aria-label={`View ${document.title}`}
                        className="rounded-lg p-2 hover:bg-surface-muted"
                        href={`/app/documents/${document.document_id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        aria-label={`Ask about ${document.title}`}
                        className="rounded-lg p-2 hover:bg-surface-muted"
                        href={`/app/chat?documentId=${document.document_id}`}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Link>
                      <Link
                        aria-label={`Download ${document.title}`}
                        className="rounded-lg p-2 hover:bg-surface-muted"
                        href={`/app/documents/${document.document_id}?download=true`}
                      >
                        <Download className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {!loading && data && !data.results.length ? (
        <EmptyState
          title="No documents in this workspace"
          description="Upload the first record with its survey number. Metadata becomes searchable immediately while processing continues."
          action={
            <Link
              className="inline-flex items-center gap-2 rounded-base bg-foreground px-4 py-2.5 text-xs font-bold text-background"
              href="/app/documents/upload"
            >
              <Upload className="h-4 w-4" /> Upload document
            </Link>
          }
        />
      ) : null}
      {!loading && data && data.total > 0 ? (
        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button
            className="rounded-base border px-3 py-2 text-xs font-bold disabled:opacity-40"
            disabled={page === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            type="button"
          >
            Previous
          </button>
          <span className="px-2 text-xs text-muted-foreground">
            Page {page}
          </span>
          <button
            className="rounded-base border px-3 py-2 text-xs font-bold disabled:opacity-40"
            disabled={page * data.page_size >= data.total}
            onClick={() => setPage((value) => value + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
