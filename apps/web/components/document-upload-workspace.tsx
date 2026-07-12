"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FilePlus2,
  FileText,
  MessageSquare,
  Trash2,
  Upload,
} from "lucide-react";

import { BusinessSelect } from "@/components/business-select";
import { Button } from "@/components/ui/button";
import { businesses } from "@/lib/foundation-data";
import {
  getStoredDocuments,
  saveStoredDocuments,
  type StoredBusinessDocument,
} from "@/lib/document-store";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createId() {
  return (
    globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`
  );
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsText(file);
  });
}

function isTextLike(file: File) {
  const name = file.name.toLowerCase();
  return (
    file.type.startsWith("text/") ||
    name.endsWith(".csv") ||
    name.endsWith(".json") ||
    name.endsWith(".md") ||
    name.endsWith(".txt")
  );
}

export function DocumentUploadWorkspace() {
  const [businessId, setBusinessId] = useState(businesses[0].id);
  const [items, setItems] = useState<StoredBusinessDocument[]>([]);
  const [error, setError] = useState("");
  const selectedBusiness = useMemo(
    () =>
      businesses.find((business) => business.id === businessId) ??
      businesses[0],
    [businessId],
  );
  const selectedItems = useMemo(
    () => items.filter((item) => item.businessId === businessId),
    [businessId, items],
  );

  useEffect(() => {
    setItems(getStoredDocuments());
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    setError("");

    try {
      const nextItems = await Promise.all(
        Array.from(files).map(async (file) => {
          const baseItem = {
            id: `${file.name}-${file.lastModified}-${createId()}`,
            businessId,
            filename: file.name,
            mimeType: file.type || "application/octet-stream",
            size: formatBytes(file.size),
            status: "Ready for Gemini" as const,
            uploadedAt: new Date().toISOString(),
          };

          if (isTextLike(file)) {
            return {
              ...baseItem,
              text: await readAsText(file),
            };
          }

          const dataUrl = await readAsDataUrl(file);
          return {
            ...baseItem,
            data: dataUrl.split(",")[1] ?? "",
          };
        }),
      );

      setItems((current) => {
        const next = [...nextItems, ...current];
        saveStoredDocuments(next);
        return next;
      });
    } catch {
      setError("Could not read one of the selected files.");
    }
  }

  function removeDocument(documentId: string) {
    setItems((current) => {
      const next = current.filter((item) => item.id !== documentId);
      saveStoredDocuments(next);
      return next;
    });
  }

  function clearSelectedDocuments() {
    setItems((current) => {
      const next = current.filter((item) => item.businessId !== businessId);
      saveStoredDocuments(next);
      return next;
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-md border border-border bg-white p-5">
        <BusinessSelect
          label="Upload for business"
          onChange={setBusinessId}
          value={businessId}
        />
        <label className="mt-5 flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-6 text-center hover:bg-slate-100">
          <Upload className="h-8 w-8 text-emerald-800" />
          <span className="mt-4 font-medium text-slate-950">
            Add business documents
          </span>
          <span className="mt-2 max-w-md text-sm text-slate-600">
            Files are stored in this browser for test Q&A and sent to Gemini
            only when you ask a chat question.
          </span>
          <input
            className="sr-only"
            multiple
            onChange={(event) => handleFiles(event.target.files)}
            type="file"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <aside className="rounded-md border border-border bg-white p-5">
        <div className="flex items-center gap-2">
          <FilePlus2 className="h-5 w-5 text-emerald-800" />
          <h2 className="font-medium text-slate-950">Upload queue</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {selectedBusiness.name}
        </p>
        <div className="mt-5 space-y-3">
          {selectedItems.length === 0 ? (
            <div className="rounded-md border border-border bg-slate-50 p-4 text-sm text-slate-600">
              No documents selected yet.
            </div>
          ) : (
            selectedItems.map((item) => (
              <div
                className="rounded-md border border-border p-3"
                key={item.id}
              >
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4 text-slate-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-950">
                      {item.filename}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.size}
                    </p>
                    <p className="mt-2 text-xs text-emerald-800">
                      {item.status}
                    </p>
                  </div>
                  <button
                    aria-label={`Remove ${item.filename}`}
                    className="rounded-md border border-border p-1.5 text-slate-500 hover:bg-slate-50"
                    onClick={() => removeDocument(item.id)}
                    title="Remove"
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {selectedItems.length > 0 ? (
          <div className="mt-5 space-y-2">
            <Button asChild className="w-full">
              <Link href={`/app/chat?businessId=${businessId}`}>
                <MessageSquare className="h-4 w-4" />
                Ask in chat
              </Link>
            </Button>
            <Button
              className="w-full"
              onClick={clearSelectedDocuments}
              type="button"
              variant="outline"
            >
              <Trash2 className="h-4 w-4" />
              Clear test documents
            </Button>
          </div>
        ) : (
          <Button className="mt-5 w-full" disabled type="button">
            Upload a document to chat
          </Button>
        )}
      </aside>
    </div>
  );
}
