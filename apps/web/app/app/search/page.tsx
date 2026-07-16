import { SearchWorkspace } from "@/components/documents/search-workspace";

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  return (
    <section className="space-y-5">
      <header>
        <p className="label-caps text-primary">Document search</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold">
          Find an authorized record
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Search uploaded records by document name or original file name.
        </p>
      </header>
      <SearchWorkspace initialQuery={searchParams.q ?? ""} />
    </section>
  );
}
