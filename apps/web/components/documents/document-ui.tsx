"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Download,
  Eye,
  FileText,
  MessageSquare,
  Search,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { deleteDocument, type DocumentSearchResult } from "@/lib/api-client";

export function ProcessingBadge({ status }: { status: string }) {
  const ready = status === "ready";
  const failed = status === "failed" || status === "rejected";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold capitalize",
        ready && "bg-success-muted text-success",
        failed && "bg-destructive-muted text-destructive",
        !ready && !failed && "bg-warning-muted text-warning",
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function SurveyNumberBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 font-display text-xs font-bold text-primary">
      {value}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-base bg-surface-muted text-muted-foreground">
        <FileText className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-display text-base font-bold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="rounded-base border border-destructive/25 bg-destructive-muted p-4 text-sm text-destructive">
      <p className="font-semibold">We could not load these documents.</p>
      <p className="mt-1 text-xs leading-5">{message}</p>
      {retry ? (
        <button
          className="mt-3 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-bold"
          onClick={retry}
          type="button"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div aria-label="Loading documents" className="space-y-3 p-5">
      {[0, 1, 2].map((item) => (
        <div
          className="h-24 animate-pulse rounded-base bg-surface-muted"
          key={item}
        />
      ))}
    </div>
  );
}

export function SurveySearchBar({
  value,
  onChange,
  onSubmit,
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  compact?: boolean;
}) {
  return (
    <form
      className={cn(
        "flex items-center gap-2 rounded-panel border border-border-strong bg-surface p-2 shadow-panel transition-shadow focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10",
        !compact && "min-h-[68px] p-2.5",
      )}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Search
        className={cn(
          "ml-2 shrink-0 text-primary",
          compact ? "h-4 w-4" : "h-5 w-5",
        )}
      />
      <input
        aria-label="Search document names"
        className={cn(
          "min-w-0 flex-1 bg-transparent px-1 outline-none placeholder:text-muted-foreground",
          compact ? "h-9 text-sm" : "h-12 text-[15px]",
        )}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by document name"
        value={value}
      />
      <button
        className="flex h-10 shrink-0 items-center gap-2 rounded-base bg-foreground px-4 text-xs font-bold text-background transition-colors hover:bg-primary hover:text-white"
        type="submit"
      >
        Search <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}

export function DeleteDocumentButton({
  documentId,
  documentTitle,
  onDeleted,
  iconOnly = false,
}: {
  documentId: string;
  documentTitle: string;
  onDeleted: () => void;
  iconOnly?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setDeleting(true);
    setError("");
    try {
      await deleteDocument(documentId);
      setConfirming(false);
      onDeleted();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The document could not be deleted.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        aria-label={`Delete ${documentTitle}`}
        className={
          iconOnly
            ? "rounded-lg p-2 text-muted-foreground hover:bg-destructive-muted hover:text-destructive"
            : "inline-flex h-9 items-center gap-2 rounded-base border px-3 text-xs font-bold text-muted-foreground hover:border-destructive/40 hover:bg-destructive-muted hover:text-destructive"
        }
        onClick={() => setConfirming(true)}
        type="button"
      >
        <Trash2 className="h-4 w-4" /> {iconOnly ? null : "Delete"}
      </button>
      {confirming ? (
        <div
          aria-labelledby={`delete-title-${documentId}`}
          aria-modal="true"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
        >
          <div className="surface w-full max-w-md rounded-panel p-5 shadow-panel">
            <div className="flex h-10 w-10 items-center justify-center rounded-base bg-destructive-muted text-destructive">
              <Trash2 className="h-5 w-5" />
            </div>
            <h2
              className="mt-4 font-display text-lg font-bold"
              id={`delete-title-${documentId}`}
            >
              Move document to trash?
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              “{documentTitle}” will disappear from search and the document
              library. Its private original is retained for recovery.
            </p>
            {error ? (
              <p className="mt-3 rounded-base bg-destructive-muted p-3 text-xs text-destructive">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="h-10 rounded-base border px-4 text-xs font-bold"
                disabled={deleting}
                onClick={() => setConfirming(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-10 rounded-base bg-destructive px-4 text-xs font-bold text-white disabled:opacity-50"
                disabled={deleting}
                onClick={remove}
                type="button"
              >
                {deleting ? "Deleting..." : "Move to trash"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function DocumentCard({
  document,
  onDeleted,
}: {
  document: DocumentSearchResult;
  onDeleted?: (documentId: string) => void;
}) {
  return (
    <article className="surface rounded-panel p-5 transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {document.survey_number ? (
              <SurveyNumberBadge value={document.survey_number} />
            ) : null}
            <span className="text-[11px] font-semibold capitalize text-muted-foreground">
              {document.match_reason}
            </span>
          </div>
          <h2 className="mt-3 font-display text-lg font-bold">
            {document.title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {document.original_filename ?? "Original file"}
          </p>
          <p className="mt-2 text-xs font-semibold text-primary">
            {document.organization_name} / {document.business_name}
          </p>
        </div>
        <ProcessingBadge status={document.processing_status} />
      </div>
      {document.highlighted_snippet || document.description ? (
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {document.highlighted_snippet ?? document.description}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {document.category ? (
          <span>
            Category:{" "}
            <strong className="text-foreground">{document.category}</strong>
          </span>
        ) : null}
        {document.party_owner ? (
          <span>
            Owner:{" "}
            <strong className="text-foreground">{document.party_owner}</strong>
          </span>
        ) : null}
        {document.location ? (
          <span>
            Location:{" "}
            <strong className="text-foreground">{document.location}</strong>
          </span>
        ) : null}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
        <Link
          className="inline-flex h-9 items-center gap-2 rounded-base bg-foreground px-3 text-xs font-bold text-background hover:bg-primary hover:text-white"
          href={`/app/documents/${document.document_id}`}
        >
          <Eye className="h-4 w-4" /> View
        </Link>
        <Link
          className="inline-flex h-9 items-center gap-2 rounded-base border px-3 text-xs font-bold hover:bg-surface-muted"
          href={`/app/chat?documentId=${document.document_id}`}
        >
          <MessageSquare className="h-4 w-4" /> Ask
        </Link>
        <Link
          className="inline-flex h-9 items-center gap-2 rounded-base border px-3 text-xs font-bold hover:bg-surface-muted"
          href={`/app/documents/${document.document_id}?download=true`}
        >
          <Download className="h-4 w-4" /> Download
        </Link>
        {document.can_delete && onDeleted ? (
          <div className="ml-auto">
            <DeleteDocumentButton
              documentId={document.document_id}
              documentTitle={document.title}
              onDeleted={() => onDeleted(document.document_id)}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
