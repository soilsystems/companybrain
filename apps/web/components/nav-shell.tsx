import Link from "next/link";
import { Building2, FileText, MessageSquare, Settings } from "lucide-react";
import type { ReactNode } from "react";

import { ApiHealth } from "@/components/api-health";
import { workspace } from "@/lib/foundation-data";

const items = [
  { href: "/app", label: "Workspace", icon: Building2 },
  { href: "/app/chat", label: "Chat", icon: MessageSquare },
  { href: "/app/documents", label: "Documents", icon: FileText },
  { href: "/app/settings", label: "Settings", icon: Settings }
];

export function NavShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-white p-4 md:block">
        <Link href="/" className="mb-8 block text-lg font-semibold">
          Company Brain
        </Link>
        <nav className="space-y-1">
          {items.map((item) => (
            <Link
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-muted"
              href={item.href}
              key={item.href}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-4 left-4 right-4 space-y-3">
          <ApiHealth />
          <div className="rounded-md border border-border bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-950">{workspace.user}</p>
            <p className="mt-1 text-muted-foreground">{workspace.role}</p>
          </div>
        </div>
      </aside>
      <main className="md:pl-64">
        <div className="mx-auto max-w-6xl px-5 py-6">{children}</div>
      </main>
    </div>
  );
}
