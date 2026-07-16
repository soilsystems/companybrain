"use client";

import { CheckCircle2, FileText, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { DragEvent, FormEvent, useState } from "react";

import { useScope } from "@/components/scope-context";
import { apiFetch } from "@/lib/api-client";

type UploadIntent = {
  document_id: string;
  document_file_id: string;
  upload_url: string;
  upload_token: string;
};

const inputClass =
  "h-10 w-full rounded-base border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

export function UploadWorkspace() {
  const router = useRouter();
  const {
    organizations,
    organization,
    business,
    domainId,
    setOrganizationId,
    setBusinessId,
    setDomainId,
    error: scopeError,
  } = useScope();
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<
    "idle" | "uploading" | "processing" | "error"
  >("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !business || !domainId) {
      setError("Choose an authorized workspace, domain, and file.");
      return;
    }
    setError("");
    setState("uploading");
    setProgress(12);
    try {
      const intent = await apiFetch<UploadIntent>(
        "/api/v1/documents/upload-intents",
        {
          method: "POST",
          body: JSON.stringify({
            business_id: business.id,
            domain_id: domainId,
            filename: file.name,
            browser_mime_type: file.type || "application/octet-stream",
            size_bytes: file.size,
            survey_number: null,
            title: documentName.trim() || file.name,
          }),
        },
      );
      setProgress(35);
      const upload = await fetch(intent.upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "x-upsert": "false",
        },
        body: file,
      });
      if (!upload.ok)
        throw new Error(
          "The private file upload did not complete. Please retry.",
        );
      setProgress(78);
      setState("processing");
      await apiFetch(`/api/v1/documents/confirm`, {
        method: "POST",
        body: JSON.stringify({ document_file_id: intent.document_file_id }),
      });
      setProgress(100);
      router.push(`/app/documents/${intent.document_id}`);
    } catch (caught) {
      setState("error");
      setError(
        caught instanceof Error
          ? caught.message
          : "The upload could not be completed.",
      );
    }
  }

  function acceptFiles(files: FileList | null) {
    if (files?.[0]) {
      setFile(files[0]);
      setDocumentName(files[0].name);
      setError("");
    }
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    acceptFiles(event.dataTransfer.files);
  }

  return (
    <form
      className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"
      onSubmit={submit}
    >
      <div className="surface rounded-panel p-5 lg:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold">
            Organization
            <select
              className={`${inputClass} mt-2`}
              onChange={(event) => setOrganizationId(event.target.value)}
              value={organization?.id ?? ""}
            >
              <option value="">Select organization</option>
              {organizations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold">
            Business workspace
            <select
              className={`${inputClass} mt-2`}
              onChange={(event) => setBusinessId(event.target.value)}
              value={business?.id ?? ""}
            >
              <option value="">Select business</option>
              {organization?.businesses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold">
            Domain or collection
            <select
              className={`${inputClass} mt-2`}
              onChange={(event) => setDomainId(event.target.value)}
              value={domainId}
            >
              <option value="">Select domain</option>
              {business?.domains.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold sm:col-span-2">
            Document name
            <input
              className={`${inputClass} mt-2`}
              onChange={(event) => setDocumentName(event.target.value)}
              placeholder="Document name"
              required
              value={documentName}
            />
          </label>
        </div>
      </div>
      <aside className="space-y-4">
        <div className="surface rounded-panel p-5">
          <div className="label-caps mb-3">Original file</div>
          <label
            className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-base border border-dashed border-border-strong bg-surface-muted p-5 text-center hover:border-primary"
            onDragOver={(event) => event.preventDefault()}
            onDrop={drop}
          >
            <UploadCloud className="h-8 w-8 text-primary" />
            <span className="mt-3 text-sm font-bold">
              Drop a file or choose one
            </span>
            <span className="mt-2 text-xs leading-5 text-muted-foreground">
              PDF, JPG, PNG, WebP, DOCX, XLSX, CSV, TXT and supported business
              files
            </span>
            <input
              className="sr-only"
              onChange={(event) => acceptFiles(event.target.files)}
              type="file"
            />
          </label>
          {file ? (
            <div className="mt-3 flex items-center gap-3 rounded-base border p-3">
              <FileText className="h-4 w-4 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold">{file.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {Math.max(1, Math.round(file.size / 1024))} KB
                </p>
              </div>
              <button
                aria-label="Remove selected file"
                onClick={() => {
                  setFile(null);
                  setDocumentName("");
                }}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
        {state !== "idle" ? (
          <div className="surface rounded-panel p-4">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>
                {state === "processing"
                  ? "Processing document"
                  : state === "error"
                    ? "Upload interrupted"
                    : "Uploading privately"}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            {state === "processing" ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" /> The document
                name is searchable while processing continues.
              </p>
            ) : null}
          </div>
        ) : null}
        {error || scopeError ? (
          <p className="rounded-base border border-destructive/30 bg-destructive-muted p-3 text-xs leading-5 text-destructive">
            {error || scopeError}
          </p>
        ) : null}
        <button
          className="flex h-11 w-full items-center justify-center gap-2 rounded-base bg-foreground text-sm font-bold text-background hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!file || state === "uploading" || state === "processing"}
          type="submit"
        >
          <UploadCloud className="h-4 w-4" /> Upload document
        </button>
      </aside>
    </form>
  );
}
