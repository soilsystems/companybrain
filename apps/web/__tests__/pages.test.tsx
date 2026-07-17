import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import ChatPage from "@/app/app/chat/page";
import DocumentsPage from "@/app/app/documents/page";
import AppHomePage from "@/app/app/page";
import HomePage from "@/app/page";
import SearchPage from "@/app/app/search/page";
import { DeleteDocumentButton } from "@/components/documents/document-ui";

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
    expect(screen.getByLabelText("Search document names")).toHaveValue("289/2");
  });

  it("renders a search-first dashboard", () => {
    render(<AppHomePage />);
    expect(
      screen.getByRole("heading", { name: "Business Workspace Overview" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Search document names")).toBeInTheDocument();
  });

  it("requires confirmation before moving a document to trash", () => {
    render(
      <DeleteDocumentButton
        documentId="document-1"
        documentTitle="Ownership record"
        onDeleted={() => undefined}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Delete Ownership record" }),
    );
    expect(
      screen.getByRole("heading", { name: "Move document to trash?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Move to trash" }),
    ).toBeInTheDocument();
  });
});
