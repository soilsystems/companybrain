import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import ChatPage from "@/app/app/chat/page";
import DocumentsPage from "@/app/app/documents/page";
import AppHomePage from "@/app/app/page";
import HomePage from "@/app/page";
import SearchPage from "@/app/app/search/page";

describe("document-search-first pages", () => {
  beforeEach(() => window.localStorage.clear());

  it("renders Company Brain authentication as the first experience", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { name: "Access Company Brain" }),
    ).toBeInTheDocument();
  });

  it("renders the grounded document chat workspace", () => {
    render(<ChatPage />);
    expect(
      screen.getByRole("heading", { name: "Ask with document evidence" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Ask about documents")).toBeInTheDocument();
  });

  it("renders the document library", () => {
    render(<DocumentsPage />);
    expect(
      screen.getByRole("heading", { name: "Business records" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Upload" })).toHaveAttribute(
      "href",
      "/app/documents/upload",
    );
  });

  it("renders exact survey search as the primary search control", () => {
    render(<SearchPage searchParams={{ q: "289/2" }} />);
    expect(
      screen.getByRole("heading", { name: "Find an authorized record" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Search document names"),
    ).toHaveValue("289/2");
  });

  it("renders a search-first dashboard", () => {
    render(<AppHomePage />);
    expect(
      screen.getByRole("heading", { name: "Business Workspace Overview" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Search document names"),
    ).toBeInTheDocument();
  });
});
