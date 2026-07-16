"use client";

import { SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

import { useScope } from "@/components/scope-context";
import {
  DocumentCard,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  SurveySearchBar,
} from "@/components/documents/document-ui";
import { type DocumentSearchResponse, searchDocuments } from "@/lib/api-client";

export function SearchWorkspace({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const {
    business,
    domainId,
    loading: scopeLoading,
    error: scopeError,
  } = useScope();
  const [query, setQuery] = useState(initialQuery);
  const [submitted, setSubmitted] = useState(initialQuery);
  const [data, setData] = useState<DocumentSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [processingStatus, setProcessingStatus] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!submitted || !business) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      q: submitted,
      business_id: business.id,
      page: String(page),
      page_size: "20",
    });
    if (domainId) params.set("domain_id", domainId);
    if (category) params.set("category", category);
    if (documentType) params.set("document_type", documentType);
    if (processingStatus) params.set("processing_status", processingStatus);
    searchDocuments(params)
      .then(setData)
      .catch((caught: Error) => setError(caught.message))
      .finally(() => setLoading(false));
  }, [
    business,
    category,
    documentType,
    domainId,
    page,
    processingStatus,
    submitted,
  ]);

  function runSearch() {
    if (query.trim()) {
      setPage(1);
      setSubmitted(query.trim());
    }
  }

  return (
    <div className="space-y-5">
      <div className="surface rounded-panel p-4 lg:p-5">
        <SurveySearchBar
          onChange={setQuery}
          onSubmit={runSearch}
          value={query}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
          <span>
            Exact survey matches are ranked before metadata, full-text, and
            semantic matches.
          </span>
          <button
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-semibold hover:bg-surface-muted"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((value) => !value)}
            type="button"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
          </button>
        </div>
        {filtersOpen ? (
          <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3">
            <input
              aria-label="Category filter"
              className="h-9 rounded-base border bg-surface px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
              placeholder="Category"
              value={category}
            />
            <input
              aria-label="Document type filter"
              className="h-9 rounded-base border bg-surface px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              onChange={(event) => {
                setDocumentType(event.target.value);
                setPage(1);
              }}
              placeholder="Document type"
              value={documentType}
            />
            <select
              aria-label="Processing status filter"
              className="h-9 rounded-base border bg-surface px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
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
      </div>

      {scopeLoading ? <LoadingSkeleton /> : null}
      {!scopeLoading && !business ? (
        <ErrorState
          message={
            scopeError ||
            "Choose an authorized business workspace before searching."
          }
        />
      ) : null}
      {loading ? (
        <div className="surface rounded-panel">
          <LoadingSkeleton />
        </div>
      ) : null}
      {error ? <ErrorState message={error} retry={runSearch} /> : null}
      {!loading && !error && data ? (
        <div>
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{data.total}</strong>{" "}
              authorized result{data.total === 1 ? "" : "s"}
            </span>
            <span>Sorted by match quality</span>
          </div>
          {data.results.length ? (
            <>
              <div className="grid gap-3">
                {data.results.map((document) => (
                  <DocumentCard
                    document={document}
                    key={document.document_id}
                  />
                ))}
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
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
            </>
          ) : (
            <div className="surface rounded-panel">
              <EmptyState
                title="No authorized documents found"
                description={`No document matched “${data.query}” in the selected workspace. Check the survey number or try a title, owner, or location.`}
              />
            </div>
          )}
        </div>
      ) : null}
      {!submitted && !loading ? (
        <div className="surface rounded-panel">
          <EmptyState
            title="Search the records workspace"
            description="Enter a survey number such as 289/2, or search document titles, owners, locations, tags, and indexed content."
          />
        </div>
      ) : null}
    </div>
  );
}
