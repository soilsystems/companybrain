"use client";

import { useMemo, useState } from "react";
import { FilePlus2, FileText, Upload } from "lucide-react";

import { BusinessSelect } from "@/components/business-select";
import { Button } from "@/components/ui/button";
import { businesses } from "@/lib/foundation-data";

type UploadItem = {
  id: string;
  businessId: string;
  filename: string;
  size: string;
  status: "Ready for API" | "Queued locally";
};

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

export function DocumentUploadWorkspace() {
  const [businessId, setBusinessId] = useState(businesses[0].id);
  const [items, setItems] = useState<UploadItem[]>([]);
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

  function handleFiles(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const nextItems = Array.from(files).map((file) => ({
      id: `${file.name}-${file.lastModified}-${createId()}`,
      businessId,
      filename: file.name,
      size: formatBytes(file.size),
      status: "Queued locally" as const,
    }));
    setItems((current) => [...nextItems, ...current]);
  }

  function createUploadIntent() {
    setItems((current) =>
      current.map((item) =>
        item.businessId === businessId
          ? { ...item, status: "Ready for API" }
          : item,
      ),
    );
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
            Files stay local in this foundation screen until the signed upload
            API and Supabase Storage flow are connected.
          </span>
          <input
            className="sr-only"
            multiple
            onChange={(event) => handleFiles(event.target.files)}
            type="file"
          />
        </label>
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
                </div>
              </div>
            ))
          )}
        </div>
        <Button
          className="mt-5 w-full"
          disabled={selectedItems.length === 0}
          onClick={createUploadIntent}
          type="button"
        >
          Create upload intent
        </Button>
      </aside>
    </div>
  );
}
