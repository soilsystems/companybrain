export type StoredBusinessDocument = {
  id: string;
  businessId: string;
  filename: string;
  mimeType: string;
  size: string;
  status: "Ready for Gemini" | "Queued locally";
  uploadedAt: string;
  text?: string;
  data?: string;
};

export const documentStorageKey = "companybrain.documents.v1";

export function getStoredDocuments() {
  if (typeof window === "undefined") {
    return [];
  }

  const saved = window.localStorage.getItem(documentStorageKey);
  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved) as StoredBusinessDocument[];
  } catch {
    window.localStorage.removeItem(documentStorageKey);
    return [];
  }
}

export function saveStoredDocuments(documents: StoredBusinessDocument[]) {
  window.localStorage.setItem(documentStorageKey, JSON.stringify(documents));
  window.dispatchEvent(new Event("companybrain:documents-changed"));
}
