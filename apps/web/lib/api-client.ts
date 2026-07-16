import { env } from "@/lib/env";

export type DomainSummary = {
  id: string;
  slug: string;
  name: string;
  enabled: boolean;
};
export type BusinessSummary = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  role: string;
  domains: DomainSummary[];
};
export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  businesses: BusinessSummary[];
};
export type MeResponse = {
  user: {
    id: string;
    email: string;
    display_name: string | null;
    status: string;
  };
  organizations: OrganizationSummary[];
};

export type DocumentIdentifier = {
  type: string;
  value: string;
  normalized_value: string;
  is_primary: boolean;
};

export type DocumentSearchResult = {
  document_id: string;
  title: string;
  survey_number: string | null;
  alternate_identifiers: DocumentIdentifier[];
  description: string | null;
  category: string | null;
  document_type: string | null;
  document_date: string | null;
  party_owner: string | null;
  location: string | null;
  tags: string[];
  original_filename: string | null;
  match_type: string;
  match_reason: string;
  highlighted_snippet: string | null;
  score: number;
  processing_status: string;
  can_view: boolean;
  can_download: boolean;
  updated_at: string;
};

export type DocumentSearchResponse = {
  query: string;
  page: number;
  page_size: number;
  total: number;
  results: DocumentSearchResult[];
};

export type DocumentDetail = {
  document_id: string;
  title: string;
  display_name: string;
  description: string | null;
  category: string | null;
  document_type: string | null;
  document_date: string | null;
  party_owner: string | null;
  location: string | null;
  tags: string[];
  identifiers: DocumentIdentifier[];
  processing_status: string;
  original_filename: string | null;
  normalized_mime_type: string | null;
  size_bytes: number | null;
  version_number: number;
  can_view: boolean;
  can_download: boolean;
  created_at: string;
  updated_at: string;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getAccessToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("companybrain.access_token") ?? "";
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as {
    detail?: string;
  } & T;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload.detail || "The request could not be completed.",
    );
  }
  return payload;
}

export async function searchDocuments(params: URLSearchParams) {
  return apiFetch<DocumentSearchResponse>(
    `/api/v1/documents/search?${params.toString()}`,
  );
}

export async function getDocument(documentId: string) {
  return apiFetch<DocumentDetail>(`/api/v1/documents/${documentId}`);
}

export async function createDocumentUrl(
  documentId: string,
  action: "view" | "download",
) {
  return apiFetch<{ url: string; expires_in_seconds: number }>(
    `/api/v1/documents/${documentId}/${action}-url`,
    { method: "POST" },
  );
}
