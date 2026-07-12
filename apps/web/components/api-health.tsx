"use client";

import { useEffect, useState } from "react";

import { env } from "@/lib/env";

type HealthState = "loading" | "ok" | "error" | "not_configured";

export function ApiHealth() {
  const [state, setState] = useState<HealthState>("loading");

  useEffect(() => {
    const apiUrl = new URL(env.NEXT_PUBLIC_API_BASE_URL);
    if (
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1" &&
      (apiUrl.hostname === "localhost" || apiUrl.hostname === "127.0.0.1")
    ) {
      setState("not_configured");
      return;
    }

    const controller = new AbortController();
    fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/health`, { signal: controller.signal })
      .then((response) => setState(response.ok ? "ok" : "error"))
      .catch(() => setState("error"));
    return () => controller.abort();
  }, []);

  return (
    <div className="rounded-md border border-border px-3 py-2 text-sm">
      <span className="text-muted-foreground">Backend</span>{" "}
      <span className={state === "ok" ? "text-emerald-700" : "text-slate-700"}>
        {state === "not_configured" ? "not connected" : state}
      </span>
    </div>
  );
}
