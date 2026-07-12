import { NextResponse } from "next/server";
import { z } from "zod";

import { buildGeminiInput, geminiModel, readGeminiText } from "@/lib/gemini";

export const runtime = "nodejs";
const geminiTimeoutMs = 70000;

const documentSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.string(),
  status: z.enum(["Ready for Gemini", "Queued locally"]),
  uploadedAt: z.string(),
  text: z.string().optional(),
  data: z.string().optional(),
});

const requestSchema = z.object({
  businessId: z.string(),
  question: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      }),
    )
    .default([]),
  documents: z.array(documentSchema).default([]),
});

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid chat request." },
      { status: 400 },
    );
  }

  const input = buildGeminiInput(parsed.data);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), geminiTimeoutMs);
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.GEMINI_MODEL || geminiModel,
        input,
        system_instruction:
          "You are Company Brain, a business document Q&A assistant. Answer clearly, cite document filenames when possible, and never invent facts outside the supplied business documents.",
        generation_config: {
          temperature: 0.2,
          thinking_level: "low",
        },
      }),
    },
  ).catch((error: unknown) => {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }
    throw error;
  });
  clearTimeout(timeout);

  if (!response) {
    return NextResponse.json(
      {
        error:
          "Gemini is still reading this document. Try a smaller test file or ask again in a moment.",
      },
      { status: 504 },
    );
  }

  const payload = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) {
    const geminiError =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error &&
      typeof payload.error === "object" &&
      "message" in payload.error &&
      typeof payload.error.message === "string"
        ? payload.error.message
        : "";
    return NextResponse.json(
      {
        error: geminiError
          ? `Gemini could not process this request: ${geminiError}`
          : "Gemini could not answer right now. Check the API key, model access, and uploaded document size.",
      },
      { status: response.status },
    );
  }

  const answer = readGeminiText(payload);
  if (!answer) {
    return NextResponse.json(
      { error: "Gemini returned an empty response." },
      { status: 502 },
    );
  }

  return NextResponse.json({ answer });
}
