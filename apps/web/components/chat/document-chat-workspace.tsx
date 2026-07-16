"use client";

import Link from "next/link";
import {
  Download,
  FileText,
  LoaderCircle,
  MessageSquare,
  Send,
} from "lucide-react";
import { FormEvent, useState } from "react";

import { useScope } from "@/components/scope-context";
import { SurveyNumberBadge } from "@/components/documents/document-ui";
import { apiFetch } from "@/lib/api-client";

type ChatResponse = {
  status: string;
  answer: string;
  citations: Array<{
    document_id: string;
    document_title: string;
    chunk_id: string;
    page_start: number | null;
    page_end: number | null;
    section_label: string | null;
    excerpt: string;
  }>;
  documents: Array<{
    document_id: string;
    title: string;
    survey_number: string | null;
    view_path: string;
    download_path: string;
  }>;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: ChatResponse;
};

export function DocumentChatWorkspace({ documentId }: { documentId?: string }) {
  const { business, domainId, error: scopeError } = useScope();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: documentId
        ? "This conversation is scoped to the selected document. Ask about a clause, owner, date, or obligation."
        : "Ask about an authorized document or survey number. I will resolve exact identifiers before searching document content.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(event: FormEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || !business || loading) return;
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setLoading(true);
    try {
      const response = await apiFetch<ChatResponse>("/api/v1/chat/query", {
        method: "POST",
        body: JSON.stringify({
          business_id: business.id,
          domain_id: domainId || null,
          question,
          document_id: documentId || null,
        }),
      });
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.answer,
          response,
        },
      ]);
    } catch (caught) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            caught instanceof Error
              ? caught.message
              : "The document query could not be completed.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="surface relative flex min-h-[680px] flex-col overflow-hidden rounded-panel">
      <div className="flex items-center justify-between border-b bg-surface-muted px-5 py-4">
        <div>
          <h2 className="font-display text-sm font-bold">
            Grounded document chat
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {documentId
              ? "One-document evidence scope"
              : "Authorized workspace evidence only"}
          </p>
        </div>
        <span className="rounded-full bg-success-muted px-2.5 py-1 text-[11px] font-bold text-success">
          Evidence required
        </span>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6 pb-40 lg:px-8">
        {messages.map((message) => (
          <article className="flex gap-3" key={message.id}>
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-[10px] font-bold ${message.role === "assistant" ? "bg-primary text-white" : "bg-surface-muted text-foreground"}`}
            >
              {message.role === "assistant" ? "CB" : "YOU"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold">
                {message.role === "assistant" ? "Company Brain" : "You"}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {message.content}
              </p>
              {message.response?.documents.length ? (
                <div className="mt-4 grid gap-2">
                  {message.response.documents.map((document) => (
                    <div
                      className="rounded-base border bg-surface-muted p-4"
                      key={document.document_id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          {document.survey_number ? (
                            <SurveyNumberBadge value={document.survey_number} />
                          ) : null}
                          <h3 className="mt-2 text-sm font-bold">
                            {document.title}
                          </h3>
                        </div>
                        <div className="flex gap-2">
                          <Link
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-foreground px-3 text-[11px] font-bold text-background"
                            href={document.view_path}
                          >
                            <FileText className="h-3.5 w-3.5" /> View
                          </Link>
                          <Link
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-surface px-3 text-[11px] font-bold"
                            href={document.download_path}
                          >
                            <Download className="h-3.5 w-3.5" /> Download
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {message.response?.citations.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.response.citations.map((citation, index) => (
                    <details className="group" key={citation.chunk_id}>
                      <summary className="cursor-pointer list-none rounded-full border bg-surface px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/10">
                        {citation.document_title}
                        {citation.page_start
                          ? ` · p.${citation.page_start}`
                          : ` · source ${index + 1}`}
                      </summary>
                      <div className="mt-2 max-w-xl rounded-base border bg-surface-muted p-3 text-xs leading-5 text-muted-foreground">
                        {citation.excerpt}
                      </div>
                    </details>
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        ))}
        {loading ? (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin text-primary" />{" "}
            Resolving identifiers and retrieving authorized evidence...
          </div>
        ) : null}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-5 pt-10 lg:px-8">
        <form
          className="mx-auto max-w-3xl rounded-panel border border-border-strong bg-surface p-3 shadow-panel focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10"
          onSubmit={send}
        >
          <div className="flex items-center gap-2 border-b px-1 pb-2 text-[11px] text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" /> Exact survey lookup
            precedes document retrieval
          </div>
          <textarea
            aria-label="Ask about documents"
            className="mt-2 min-h-16 w-full resize-none bg-transparent p-2 text-sm outline-none"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="What does survey 288 say about ownership?"
            value={draft}
          />
          <div className="flex items-center justify-between">
            <span className="px-2 text-[11px] text-destructive">
              {!business ? scopeError : ""}
            </span>
            <button
              className="flex h-9 items-center gap-2 rounded-base bg-foreground px-4 text-xs font-bold text-background hover:bg-primary hover:text-white disabled:opacity-50"
              disabled={!business || !draft.trim() || loading}
              type="submit"
            >
              Send <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
