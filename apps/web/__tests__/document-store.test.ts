import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DocumentStorageError,
  getStoredDocuments,
  saveStoredDocuments,
  type StoredBusinessDocument,
} from "@/lib/document-store";

function document(data: string): StoredBusinessDocument {
  return {
    id: "document-1",
    businessId: "dubai-fruits-trading",
    filename: "WhatsApp Market Report.JPEG",
    mimeType: "application/octet-stream",
    size: "6 MB",
    status: "Ready for Gemini",
    uploadedAt: "2026-07-13T00:00:00.000Z",
    data,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(window, "indexedDB", {
    configurable: true,
    value: undefined,
  });
  window.localStorage.clear();
});

describe("document storage", () => {
  it("stores documents larger than localStorage in IndexedDB", async () => {
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: new IDBFactory(),
    });
    const uploaded = document("a".repeat(6 * 1024 * 1024));

    await saveStoredDocuments([uploaded]);

    const stored = await getStoredDocuments();
    expect(stored).toHaveLength(1);
    expect(stored[0].filename).toBe("WhatsApp Market Report.JPEG");
    expect(stored[0].data).toHaveLength(6 * 1024 * 1024);
  });

  it("maps browser quota failures to a controlled storage error", async () => {
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: undefined,
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    await expect(saveStoredDocuments([document("data")])).rejects.toBeInstanceOf(
      DocumentStorageError,
    );
  });
});
