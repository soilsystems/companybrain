export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-md border border-border bg-white p-6">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Supabase Auth wiring starts here. The foundation keeps service-role credentials on the server.
        </p>
      </div>
    </main>
  );
}
