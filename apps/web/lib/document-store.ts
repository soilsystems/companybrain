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
const databaseName = "companybrain.documents";
const storeName = "documents";

export class DocumentStorageError extends Error {
  constructor() {
    super("document_storage_failed");
    this.name = "DocumentStorageError";
  }
}

function getLegacyDocuments() {
  const saved = window.localStorage.getItem(documentStorageKey);
  if (!saved) return [];
  try {
    const documents = JSON.parse(saved) as StoredBusinessDocument[];
    return Array.isArray(documents) ? documents : [];
  } catch {
    window.localStorage.removeItem(documentStorageKey);
    return [];
  }
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, 1);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: "id" });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
    request.addEventListener("blocked", () => reject(new Error("blocked")));
  });
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

function transactionComplete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("abort", () => reject(transaction.error));
    transaction.addEventListener("error", () => reject(transaction.error));
  });
}

async function migrateLegacyDocuments(database: IDBDatabase) {
  const legacy = getLegacyDocuments();
  if (legacy.length === 0) return;
  const transaction = database.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  for (const document of legacy) store.put(document);
  await transactionComplete(transaction);
  window.localStorage.removeItem(documentStorageKey);
}

export async function getStoredDocuments() {
  if (typeof window === "undefined") return [];
  if (typeof window.indexedDB === "undefined") return getLegacyDocuments();

  try {
    const database = await openDatabase();
    await migrateLegacyDocuments(database);
    const transaction = database.transaction(storeName, "readonly");
    const documents = await requestResult(
      transaction.objectStore(storeName).getAll() as IDBRequest<
        StoredBusinessDocument[]
      >,
    );
    database.close();
    return documents.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  } catch {
    throw new DocumentStorageError();
  }
}

export async function saveStoredDocuments(
  documents: StoredBusinessDocument[],
) {
  if (typeof window.indexedDB === "undefined") {
    try {
      window.localStorage.setItem(documentStorageKey, JSON.stringify(documents));
    } catch {
      throw new DocumentStorageError();
    }
  } else {
    try {
      const database = await openDatabase();
      const transaction = database.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      store.clear();
      for (const document of documents) store.put(document);
      await transactionComplete(transaction);
      database.close();
    } catch {
      throw new DocumentStorageError();
    }
  }
  window.dispatchEvent(new Event("companybrain:documents-changed"));
}
