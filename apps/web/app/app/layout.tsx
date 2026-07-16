import { NavShell } from "@/components/nav-shell";
import { ScopeProvider } from "@/components/scope-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ScopeProvider>
      <NavShell>{children}</NavShell>
    </ScopeProvider>
  );
}
