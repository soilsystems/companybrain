import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ChatPage from "@/app/app/chat/page";
import AppHomePage from "@/app/app/page";
import HomePage from "@/app/page";

describe("pages", () => {
  it("renders the home page", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "Company Brain" })).toBeInTheDocument();
  });

  it("renders the chat placeholder", () => {
    render(<ChatPage />);
    expect(screen.getByRole("heading", { name: "Domain-scoped assistant" })).toBeInTheDocument();
  });

  it("renders the workspace foundation", () => {
    render(<AppHomePage />);
    expect(screen.getByRole("heading", { name: "Company Brain foundation" })).toBeInTheDocument();
    expect(screen.getByText("Dubai Fruits Trading")).toBeInTheDocument();
  });
});
