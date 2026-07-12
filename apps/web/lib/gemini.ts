import { businesses } from "@/lib/foundation-data";
import type { StoredBusinessDocument } from "@/lib/document-store";

type GeminiTextPart = {
  type: "text";
  text: string;
};

type GeminiDocumentPart = {
  type: "document";
  data: string;
  mime_type: string;
};

type GeminiInputPart = GeminiTextPart | GeminiDocumentPart;

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
      parts.push({
        type: "document",
        data: document.data,
        mime_type: document.mimeType || "application/pdf",
      });
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
