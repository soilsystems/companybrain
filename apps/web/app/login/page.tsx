import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-md border border-border bg-white p-6 shadow-sm">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-800">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <form className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            className="h-10 w-full rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            id="email"
            name="email"
            placeholder="name@company.com"
            type="email"
          />
          <label className="block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            className="h-10 w-full rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            id="password"
            name="password"
            type="password"
          />
          <Button className="w-full" type="button">
            Continue
          </Button>
        </form>
        <Button asChild className="mt-3 w-full" variant="outline">
          <Link href="/app">Enter foundation workspace</Link>
        </Button>
      </div>
    </main>
  );
}
