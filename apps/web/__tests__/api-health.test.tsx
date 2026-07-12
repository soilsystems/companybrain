import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiHealth } from "@/components/api-health";

describe("ApiHealth", () => {
  it("renders a backend error state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    render(<ApiHealth />);
    await waitFor(() => expect(screen.getByText("error")).toBeInTheDocument());
  });

  it("renders a backend healthy state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(<ApiHealth />);
    await waitFor(() => expect(screen.getByText("ok")).toBeInTheDocument());
  });
});
