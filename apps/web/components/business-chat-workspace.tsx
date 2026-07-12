"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  LoaderCircle,
  MessageSquarePlus,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";

import { BusinessSelect } from "@/components/business-select";
import { Button } from "@/components/ui/button";
import {
  getStoredDocuments,
  type StoredBusinessDocument,
} from "@/lib/document-store";
import { businesses } from "@/lib/foundation-data";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatSession = {
  id: string;
  businessId: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
};

const storageKey = "companybrain.chat.sessions.v1";
const chatTimeoutMs = 75000;

function createId() {
  return (
    globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`
  );
}

function createSession(businessId: string): ChatSession {
  return {
    id: createId(),
    businessId,
    title: "New chat",
    messages: [
      {
        id: createId(),
        role: "assistant",
        content:
          "Upload documents for a business, choose that business here, then ask a question.",
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function BusinessChatWorkspace() {
  const [businessId, setBusinessId] = useState(businesses[0].id);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string>("");
  const [editingTitle, setEditingTitle] = useState("");
  const [documents, setDocuments] = useState<StoredBusinessDocument[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    function refreshDocuments() {
      setDocuments(getStoredDocuments());
    }

    const requestedBusinessId =
      new URLSearchParams(window.location.search).get("businessId") ?? "";
    const validRequestedBusiness = businesses.some(
      (business) => business.id === requestedBusinessId,
    )
      ? requestedBusinessId
      : "";
    let loadedSavedSession = false;
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChatSession[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const requestedSession = validRequestedBusiness
            ? parsed.find(
                (session) => session.businessId === validRequestedBusiness,
              )
            : undefined;
          const activeSession = requestedSession ?? parsed[0];
          const nextSessions =
            validRequestedBusiness && !requestedSession
              ? [createSession(validRequestedBusiness), ...parsed]
              : parsed;
          const nextActiveSession =
            validRequestedBusiness && !requestedSession
              ? nextSessions[0]
              : activeSession;
          setSessions(nextSessions);
          setActiveId(nextActiveSession?.id ?? "");
          setBusinessId(
            nextActiveSession?.businessId ??
              validRequestedBusiness ??
              businesses[0].id,
          );
          loadedSavedSession = true;
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    if (!loadedSavedSession) {
      const first = createSession(validRequestedBusiness || businesses[0].id);
      setSessions([first]);
      setActiveId(first.id);
      setBusinessId(first.businessId);
    }

    refreshDocuments();
    window.addEventListener("storage", refreshDocuments);
    window.addEventListener("companybrain:documents-changed", refreshDocuments);
    return () => {
      window.removeEventListener("storage", refreshDocuments);
      window.removeEventListener(
        "companybrain:documents-changed",
        refreshDocuments,
      );
    };
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      window.localStorage.setItem(storageKey, JSON.stringify(sessions));
    }
  }, [sessions]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeId),
    [activeId, sessions],
  );
  const activeDocuments = useMemo(
    () =>
      documents.filter(
        (document) =>
          document.businessId === businessId &&
          document.status === "Ready for Gemini",
      ),
    [businessId, documents],
  );

  function startChat(nextBusinessId = businessId) {
    const session = createSession(nextBusinessId);
    setSessions((current) => [session, ...current]);
    setActiveId(session.id);
    setBusinessId(nextBusinessId);
  }

  function selectSession(session: ChatSession) {
    setActiveId(session.id);
    setBusinessId(session.businessId);
  }

  function deleteSession(sessionId: string) {
    setSessions((current) => {
      const next = current.filter((session) => session.id !== sessionId);
      if (activeId === sessionId) {
        setActiveId(next[0]?.id ?? "");
        setBusinessId(next[0]?.businessId ?? businesses[0].id);
      }
      return next;
    });
    if (editingId === sessionId) {
      setEditingId("");
      setEditingTitle("");
    }
  }

  function beginRename(session: ChatSession) {
    setEditingId(session.id);
    setEditingTitle(session.title);
  }

  function saveRename() {
    const title = editingTitle.trim();
    const sessionId = editingId;
    setEditingId("");
    setEditingTitle("");
    if (!sessionId) {
      return;
    }

    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId && title
          ? {
              ...session,
              title,
              updatedAt: new Date().toISOString(),
            }
          : session,
      ),
    );
  }

  async function sendMessage() {
    const content = draft.trim();
    if (!content || !activeSession || isSending) {
      return;
    }

    const selectedBusiness =
      businesses.find((business) => business.id === activeSession.businessId) ??
      businesses[0];
    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content,
    };
    const assistantMessage: ChatMessage = {
      id: createId(),
      role: "assistant",
      content:
        activeDocuments.length > 0
          ? `Gemini is reading ${activeDocuments.length} document(s) for ${selectedBusiness.name}. PDFs can take up to a minute.`
          : `No ready documents found for ${selectedBusiness.name}. Upload a test document or switch to the business you uploaded under.`,
    };
    const requestHistory = activeSession.messages
      .filter((message) => !message.content.startsWith("Reading "))
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    setSessions((current) =>
      current.map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              title:
                session.title === "New chat"
                  ? content.slice(0, 42)
                  : session.title,
              messages: [...session.messages, userMessage, assistantMessage],
              updatedAt: new Date().toISOString(),
            }
          : session,
      ),
    );
    setDraft("");
    setIsSending(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), chatTimeoutMs);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          businessId: activeSession.businessId,
          question: content,
          history: requestHistory,
          documents: activeDocuments,
        }),
      });
      clearTimeout(timeout);
      const payload = (await response.json()) as {
        answer?: string;
        error?: string;
      };
      const nextContent =
        payload.answer ??
        payload.error ??
        "The assistant could not answer this request.";

      setSessions((current) =>
        current.map((session) =>
          session.id === activeSession.id
            ? {
                ...session,
                messages: session.messages.map((message) =>
                  message.id === assistantMessage.id
                    ? { ...message, content: nextContent }
                    : message,
                ),
                updatedAt: new Date().toISOString(),
              }
            : session,
        ),
      );
    } catch (error) {
      const nextContent =
        error instanceof DOMException && error.name === "AbortError"
          ? "Gemini is taking longer than expected with this document. Try asking again, or upload a smaller text/PDF test file."
          : "The assistant could not reach the Gemini route. Please try again.";
      setSessions((current) =>
        current.map((session) =>
          session.id === activeSession.id
            ? {
                ...session,
                messages: session.messages.map((message) =>
                  message.id === assistantMessage.id
                    ? {
                        ...message,
                        content: nextContent,
                      }
                    : message,
                ),
                updatedAt: new Date().toISOString(),
              }
            : session,
        ),
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="grid h-[calc(100vh-190px)] min-h-[520px] gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col rounded-md border border-border bg-white p-4">
        <Button className="w-full" onClick={() => startChat()} type="button">
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </Button>
        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {sessions.map((session) => {
            const business = businesses.find(
              (item) => item.id === session.businessId,
            );
            return (
              <div
                className={
                  session.id === activeId
                    ? "rounded-md border border-emerald-200 bg-emerald-50 p-3"
                    : "rounded-md border border-border p-3"
                }
                key={session.id}
              >
                {editingId === session.id ? (
                  <input
                    autoFocus
                    className="h-9 w-full rounded-md border border-border px-2 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-primary"
                    onBlur={saveRename}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        saveRename();
                      }
                      if (event.key === "Escape") {
                        setEditingId("");
                        setEditingTitle("");
                      }
                    }}
                    value={editingTitle}
                  />
                ) : (
                  <button
                    className="block w-full text-left"
                    onClick={() => selectSession(session)}
                    type="button"
                  >
                    <p className="truncate text-sm font-medium text-slate-950">
                      {session.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {business?.name}
                    </p>
                  </button>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    className="rounded-md border border-border p-1.5 text-slate-600 hover:bg-white"
                    onClick={() => beginRename(session)}
                    aria-label="Rename chat"
                    title="Rename"
                    type="button"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="rounded-md border border-border p-1.5 text-slate-600 hover:bg-white"
                    onClick={() => deleteSession(session.id)}
                    aria-label="Delete chat"
                    title="Delete"
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col rounded-md border border-border bg-white">
        <div className="border-b border-border p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <BusinessSelect
              label="Chat business context"
              onChange={(value) => {
                if (!activeSession || activeSession.messages.length > 1) {
                  startChat(value);
                  return;
                }
                setBusinessId(value);
                setSessions((current) =>
                  current.map((session) =>
                    session.id === activeSession.id
                      ? { ...session, businessId: value }
                      : session,
                  ),
                );
              }}
              value={businessId}
            />
            <div className="rounded-md border border-border bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <FileText className="h-4 w-4" />
                Documents
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeDocuments.length} ready for this chat
              </p>
              {activeDocuments.length > 0 ? (
                <p className="mt-1 truncate text-xs text-slate-600">
                  {activeDocuments
                    .map((document) => document.filename)
                    .join(", ")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
          {activeSession?.messages.map((message) => (
            <div
              className={
                message.role === "user"
                  ? "ml-auto max-w-2xl rounded-md bg-emerald-800 p-3 text-sm text-white"
                  : "max-w-2xl rounded-md border border-border bg-white p-3 text-sm text-slate-700"
              }
              key={message.id}
            >
              {message.content}
            </div>
          ))}
        </div>
        <div className="shrink-0 border-t border-border p-4">
          <div className="flex gap-3">
            <textarea
              className="min-h-14 flex-1 resize-none rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type your question about the uploaded document"
              value={draft}
            />
            <Button
              aria-label="Send message"
              disabled={isSending}
              onClick={sendMessage}
              title="Send"
              type="button"
            >
              {isSending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
