import { DocumentChatWorkspace } from "@/components/chat/document-chat-workspace";

export default function ChatPage({
  searchParams = {},
}: {
  searchParams?: { documentId?: string };
}) {
  return (
    <section className="space-y-5">
      <header>
        <p className="label-caps text-primary">Chat</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold">
          Ask with document evidence
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Survey-number questions resolve authorized records before content
          retrieval.
        </p>
      </header>
      <DocumentChatWorkspace documentId={searchParams.documentId} />
    </section>
  );
}
