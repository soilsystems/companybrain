import {
  MessageSquare,
  ShieldCheck,
  SquareDashedMousePointer,
} from "lucide-react";

import { BusinessChatWorkspace } from "@/components/business-chat-workspace";
import { PageHeader } from "@/components/page-header";
import { StatusGrid } from "@/components/status-grid";

export default function ChatPage() {
  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Chat" title="Business chat" />
      <StatusGrid
        items={[
          {
            label: "Scope resolver",
            value: "Required",
            detail: "Organization, business, domain",
            icon: ShieldCheck,
          },
          {
            label: "Tool access",
            value: "Predefined",
            detail: "No arbitrary SQL",
            icon: SquareDashedMousePointer,
          },
          {
            label: "Answer status",
            value: "Explicit",
            detail: "Answered, partial, not found",
            icon: MessageSquare,
          },
        ]}
      />
      <BusinessChatWorkspace />
    </section>
  );
}
