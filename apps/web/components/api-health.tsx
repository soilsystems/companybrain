"use client";

import { useEffect, useState } from "react";

import { env } from "@/lib/env";

type HealthState = "loading" | "ok" | "error";

export function ApiHealth() {
  const [state, setState] = useState<HealthState>("loading");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/health`, { signal: controller.signal })
      .then((response) => setState(response.ok ? "ok" : "error"))
      .catch(() => setState("error"));
    return () => controller.abort();
  }, []);

  return (
    <div className="rounded-md border border-border px-3 py-2 text-sm">
      <span className="text-muted-foreground">API</span>{" "}
      <span className={state === "ok" ? "text-emerald-700" : "text-slate-700"}>{state}</span>
    </div>
  );
}
