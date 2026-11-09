import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { OptimismLease } from "@/components/blog/explainers/OptimismLease";
import { ProofBorehole } from "@/components/blog/explainers/ProofBorehole";
import { RevisionRace } from "@/components/blog/explainers/RevisionRace";
import {
  OptimismLeaseDataSchema,
  ProofBoreholeDataSchema,
  RevisionRaceDataSchema,
} from "@/lib/blog/document";

describe("blog explainers", () => {
  it("lets the reader inspect evidence stages", () => {
    render(createElement(ProofBorehole, { data: ProofBoreholeDataSchema.parse({}) }));
    fireEvent.click(screen.getByRole("button", { name: /^Write/ }));
    expect(screen.getByRole("status")).toHaveTextContent("A prepared statement records the result.");
  });

  it("shows the stale-write conflict and retry states", () => {
    render(createElement(RevisionRace, { data: RevisionRaceDataSchema.parse({}) }));
    fireEvent.click(screen.getByRole("button", { name: "show conflict" }));
    expect(screen.getByRole("status")).toHaveTextContent("B is stale, not slow.");
    fireEvent.click(screen.getByRole("button", { name: "show retry" }));
    expect(screen.getByRole("status")).toHaveTextContent("Retry starts from truth.");
  });

  it("makes optimistic correction explicit", () => {
    render(createElement(OptimismLease, { data: OptimismLeaseDataSchema.parse({}) }));
    fireEvent.click(screen.getByRole("button", { name: "reject" }));
    expect(screen.getByRole("status")).toHaveTextContent("Corrected.");
  });
});
