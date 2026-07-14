import { describe, expect, it } from "vitest";

import {
  buildGeminiInput,
  prepareGeminiBinaryPart,
  readGeminiText,
} from "@/lib/gemini";

describe("gemini helpers", () => {
  it("routes JPEG bytes as an image input instead of a document input", () => {
    const input = buildGeminiInput({
      businessId: "dubai-fruits-trading",
      question: "Extract the table",
      history: [],
      documents: [
        {
          id: "jpeg-regression",
          businessId: "dubai-fruits-trading",
          filename: "market report.jpeg",
          mimeType: "image/jpeg",
          size: "84 KB",
          status: "Ready for Gemini",
          uploadedAt: "2026-07-13T00:00:00.000Z",
          data: "/9j/test-data",
        },
      ],
    });

    expect(input).toContainEqual({
      type: "image",
      data: "/9j/test-data",
      mime_type: "image/jpeg",
    });
  });

  it("detects JPEG bytes when the browser reports octet-stream", () => {
    expect(
      prepareGeminiBinaryPart("/9j/example", "application/octet-stream"),
    ).toEqual({
      type: "image",
      data: "/9j/example",
      mime_type: "image/jpeg",
    });
  });

  it("does not send unsupported binary types to Gemini", () => {
    expect(
      prepareGeminiBinaryPart("AAECAw==", "application/vnd.ms-excel"),
    ).toBeNull();
  });

  it("builds text document context for the selected business", () => {
    const input = buildGeminiInput({
      businessId: "dubai-fruits-trading",
      question: "What was uploaded?",
      history: [{ role: "user", content: "Summarize the file" }],
      documents: [
        {
          id: "doc-1",
          businessId: "dubai-fruits-trading",
          filename: "stock.txt",
          mimeType: "text/plain",
          size: "1 KB",
          status: "Ready for Gemini",
          uploadedAt: "2026-07-12T00:00:00.000Z",
          text: "Mango inventory is 120 boxes.",
        },
      ],
    });

    expect(input).toContainEqual(
      expect.objectContaining({
        type: "text",
        text: expect.stringContaining("Mango inventory is 120 boxes."),
      }),
    );
    expect(input.at(-1)).toEqual({
      type: "text",
      text: "Question: What was uploaded?",
    });
  });

  it("ignores documents from other businesses", () => {
    const input = buildGeminiInput({
      businessId: "dubai-fruits-trading",
      question: "What was uploaded?",
      history: [],
      documents: [
        {
          id: "doc-1",
          businessId: "logistics-business",
          filename: "private.txt",
          mimeType: "text/plain",
          size: "1 KB",
          status: "Ready for Gemini",
          uploadedAt: "2026-07-12T00:00:00.000Z",
          text: "Do not include this.",
        },
      ],
    });

    expect(JSON.stringify(input)).not.toContain("Do not include this.");
    expect(JSON.stringify(input)).toContain(
      "No uploaded documents are available",
    );
  });

  it("reads Gemini text from response variants", () => {
    expect(readGeminiText({ output_text: "Hello" })).toBe("Hello");
    expect(readGeminiText({ outputText: "Hi" })).toBe("Hi");
    expect(
      readGeminiText({
        steps: [
          { type: "thought", signature: "hidden" },
          {
            type: "model_output",
            content: [{ type: "text", text: "Ready." }],
          },
        ],
      }),
    ).toBe("Ready.");
    expect(readGeminiText({})).toBe("");
  });
});
