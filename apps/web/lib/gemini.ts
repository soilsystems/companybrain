import { businesses } from "@/lib/foundation-data";
import type { StoredBusinessDocument } from "@/lib/document-store";

type GeminiTextPart = {
  type: "text";
  text: string;
};

type GeminiDocumentPart = {
  type: "document" | "image";
  data: string;
  mime_type: string;
};

type GeminiInputPart = GeminiTextPart | GeminiDocumentPart;

const geminiImageMimes = new Set(["image/jpeg", "image/png", "image/webp"]);

const mimeAliases: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "application/x-pdf": "application/pdf",
};

export function normalizeGeminiMime(value: string) {
  const normalized = value.split(";", 1)[0].trim().toLowerCase();
  return mimeAliases[normalized] ?? normalized;
}

function detectedInlineMime(data: string) {
  const prefix = data.slice(0, 24);
  if (prefix.startsWith("/9j/")) return "image/jpeg";
  if (prefix.startsWith("iVBORw0KGgo")) return "image/png";
  if (prefix.startsWith("UklGR")) return "image/webp";
  if (prefix.startsWith("JVBERi0")) return "application/pdf";
  return "";
}

export function prepareGeminiBinaryPart(data: string, claimedMime: string) {
  const mimeType = detectedInlineMime(data) || normalizeGeminiMime(claimedMime);
  if (geminiImageMimes.has(mimeType)) {
    return { type: "image" as const, data, mime_type: mimeType };
  }
  if (mimeType === "application/pdf") {
    return { type: "document" as const, data, mime_type: mimeType };
  }
  return null;
}

export type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type GeminiChatRequest = {
  businessId: string;
  question: string;
  history: ChatHistoryItem[];
  documents: StoredBusinessDocument[];
};

export const geminiModel = "gemini-3.5-flash";

function trimForPrompt(value: string, limit = 12000) {
  return value.length > limit ? `${value.slice(0, limit)}\n[Truncated]` : value;
}

export function buildGeminiInput({
  businessId,
  question,
  history,
  documents,
}: GeminiChatRequest): GeminiInputPart[] {
  const business =
    businesses.find((item) => item.id === businessId) ?? businesses[0];
  const parts: GeminiInputPart[] = [
    {
      type: "text",
      text: [
        `Business: ${business.name}`,
        `Organization: ${business.organization}`,
        "Use only the uploaded business documents and the chat context below.",
        "If the answer is not present in those materials, say what is missing instead of guessing.",
      ].join("\n"),
    },
  ];

  const readyDocuments = documents.filter(
    (document) =>
      document.businessId === businessId &&
      document.status === "Ready for Gemini",
  );

  if (readyDocuments.length === 0) {
    parts.push({
      type: "text",
      text: "No uploaded documents are available for this business yet.",
    });
  }

  for (const document of readyDocuments.slice(0, 6)) {
    if (document.text) {
      parts.push({
        type: "text",
        text: [
          `Document: ${document.filename}`,
          `MIME type: ${document.mimeType}`,
          trimForPrompt(document.text),
        ].join("\n"),
      });
      continue;
    }

    if (document.data) {
      const binaryPart = prepareGeminiBinaryPart(
        document.data,
        document.mimeType,
      );
      if (binaryPart) {
        parts.push(binaryPart);
      } else {
        parts.push({
          type: "text",
          text: `Document ${document.filename} needs a different processor and was not sent to Gemini.`,
        });
      }
    }
  }

  const recentHistory = history.slice(-8);
  if (recentHistory.length > 0) {
    parts.push({
      type: "text",
      text: [
        "Recent chat:",
        ...recentHistory.map(
          (message) => `${message.role.toUpperCase()}: ${message.content}`,
        ),
      ].join("\n"),
    });
  }

  parts.push({
    type: "text",
    text: `Question: ${question}`,
  });

  return parts;
}

export function readGeminiText(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "output_text" in payload &&
    typeof payload.output_text === "string"
  ) {
    return payload.output_text;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "outputText" in payload &&
    typeof payload.outputText === "string"
  ) {
    return payload.outputText;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "steps" in payload &&
    Array.isArray(payload.steps)
  ) {
    return payload.steps
      .filter(
        (step) =>
          step &&
          typeof step === "object" &&
          "type" in step &&
          step.type === "model_output" &&
          "content" in step &&
          Array.isArray(step.content),
      )
      .flatMap((step) => step.content)
      .filter(
        (content) =>
          content &&
          typeof content === "object" &&
          "type" in content &&
          content.type === "text" &&
          "text" in content &&
          typeof content.text === "string",
      )
      .map((content) => content.text)
      .join("\n")
      .trim();
  }

  return "";
}
