"use client";

import Link from "next/link";
import { FileCheck2, Files, LoaderCircle, Search, Upload } from "lucide-react";
import { useEffect, useState } from "react";

import {
  DocumentCard,
  EmptyState,
  SurveySearchBar,
} from "@/components/documents/document-ui";
import { useScope } from "@/components/scope-context";
import { apiFetch, type DocumentSearchResponse } from "@/lib/api-client";

export function DashboardOverview() {
  const [query, setQuery] = useState("");
  const { business, domainId } = useScope();
  const [documents, setDocuments] = useState<DocumentSearchResponse | null>(
    null,
  );
  const [searchableTotal, setSearchableTotal] = useState<number | null>(null);
  const [processingTotal, setProcessingTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!business) return;
    const params = new URLSearchParams({
      business_id: business.id,
      page_size: "5",
    });
    if (domainId) params.set("domain_id", domainId);
    const ready = new URLSearchParams(params);
    ready.set("processing_status", "ready");
    ready.set("page_size", "1");
    const processingRequests = [
      "uploaded",
      "queued",
      "extracting",
      "chunking",
      "embedding",
    ].map((status) => {
      const scoped = new URLSearchParams(params);
      scoped.set("processing_status", status);
      scoped.set("page_size", "1");
      return apiFetch<DocumentSearchResponse>(`/api/v1/documents?${scoped}`);
    });
    Promise.all([
      apiFetch<DocumentSearchResponse>(`/api/v1/documents?${params}`),
      apiFetch<DocumentSearchResponse>(`/api/v1/documents?${ready}`),
      ...processingRequests,
    ])
      .then(([all, readyDocuments, ...processingDocuments]) => {
        setDocuments(all);
        setSearchableTotal(readyDocuments.total);
        setProcessingTotal(
          processingDocuments.reduce((total, item) => total + item.total, 0),
        );
      })
      .catch(() => setDocuments(null));
  }, [business, domainId]);

  const metrics = [
    { label: "Total documents", value: documents?.total ?? "—", icon: Files },
    {
      label: "Searchable",
      value: searchableTotal ?? "—",
      icon: FileCheck2,
    },
    {
      label: "Processing",
      value: processingTotal ?? "—",
      icon: LoaderCircle,
    },
  ];
  function search() {
    if (query.trim())
      window.location.assign(
        `/app/search?q=${encodeURIComponent(query.trim())}`,
      );
  }
  return (
    <div className="space-y-6">
      <section className="rounded-panel border bg-surface p-5 shadow-soft lg:p-7">
        <div className="max-w-3xl">
          <p className="label-caps text-primary">Records workspace</p>
          <h1 className="mt-2 font-display text-2xl font-extrabold lg:text-[28px]">
            Business Workspace Overview
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Search uploaded records by document name.
          </p>
        </div>
        <div className="mt-6">
          <SurveySearchBar
            onChange={setQuery}
            onSubmit={search}
            value={query}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span>Try:</span>
          {["report", "invoice", "agreement", "market"].map((item) => (
            <button
              className="rounded-lg border px-2 py-1 hover:border-primary hover:text-primary"
              key={item}
              onClick={() => setQuery(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {metrics.map((metric) => (
          <div className="surface rounded-panel p-5" key={metric.label}>
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>{metric.label}</span>
              <metric.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-4 font-display text-3xl font-extrabold">
              {metric.value}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <div className="surface overflow-hidden rounded-panel">
          <div className="flex items-center justify-between border-b bg-surface-muted px-5 py-4">
            <h2 className="font-display text-sm font-bold">
              Recently uploaded documents
            </h2>
            <Link
              className="text-xs font-bold text-primary"
              href="/app/documents"
            >
              View library
            </Link>
          </div>
          {documents?.results.length ? (
            <div className="grid gap-2 p-4">
              {documents.results.slice(0, 3).map((document) => (
                <DocumentCard document={document} key={document.document_id} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No recent documents loaded"
              description="Your authorized documents will appear here after the workspace API is connected."
              action={
                <Link
                  className="inline-flex items-center gap-2 rounded-base bg-foreground px-4 py-2.5 text-xs font-bold text-background hover:bg-primary hover:text-white"
                  href="/app/documents/upload"
                >
                  <Upload className="h-4 w-4" /> Upload document
                </Link>
              }
            />
          )}
        </div>
        <div className="surface overflow-hidden rounded-panel">
          <div className="border-b bg-surface-muted px-5 py-4">
            <h2 className="font-display text-sm font-bold">Recent activity</h2>
          </div>
          <div className="divide-y text-sm">
            <Link
              className="flex items-center gap-3 px-5 py-4 hover:bg-surface-muted"
              href="/app/search"
            >
              <Search className="h-4 w-4 text-primary" />
              <span>
                <strong className="block text-xs">Survey search</strong>
                <span className="text-xs text-muted-foreground">
                  Find an exact record
                </span>
              </span>
            </Link>
            <Link
              className="flex items-center gap-3 px-5 py-4 hover:bg-surface-muted"
              href="/app/documents/upload"
            >
              <Upload className="h-4 w-4 text-primary" />
              <span>
                <strong className="block text-xs">Quick upload</strong>
                <span className="text-xs text-muted-foreground">
                  Upload a searchable document
                </span>
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
