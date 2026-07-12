import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ChatPage from "@/app/app/chat/page";
import DocumentsPage from "@/app/app/documents/page";
import AppHomePage from "@/app/app/page";
import HomePage from "@/app/page";

describe("pages", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the home page", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { name: "Company Brain" }),
    ).toBeInTheDocument();
  });

  it("renders the business chat workspace", () => {
    render(<ChatPage />);
    expect(
      screen.getByRole("heading", { name: "Business chat" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New chat" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Chat business context")).toBeInTheDocument();
  });

  it("renders the business document upload workspace", () => {
    render(<DocumentsPage />);
    expect(
      screen.getByRole("heading", { name: "Business knowledge intake" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Upload for business")).toBeInTheDocument();
    expect(screen.getByText("Upload queue")).toBeInTheDocument();
  });

  it("renders the workspace foundation", () => {
    render(<AppHomePage />);
    expect(
      screen.getByRole("heading", { name: "Company Brain foundation" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Dubai Fruits Trading")).toBeInTheDocument();
  });
});
