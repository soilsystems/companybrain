import { DomainList } from "@/components/domain-list";
import { PageHeader } from "@/components/page-header";
import { ScopeSelector } from "@/components/scope-selector";
import { StatusGrid } from "@/components/status-grid";
import { foundationChecks } from "@/lib/foundation-data";

export default function AppHomePage() {
  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Workspace" title="Company Brain foundation" />
      <ScopeSelector />
      <StatusGrid items={foundationChecks} />
      <DomainList />
    </section>
  );
}
