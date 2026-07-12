import { BusinessChatWorkspace } from "@/components/business-chat-workspace";
import { PageHeader } from "@/components/page-header";

export default function ChatPage() {
  return (
    <section className="space-y-4">
      <PageHeader eyebrow="Chat" title="Business chat" />
      <BusinessChatWorkspace />
    </section>
  );
}
