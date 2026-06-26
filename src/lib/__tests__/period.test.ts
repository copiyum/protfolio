import { describe, it, expect } from "vitest";
import { formatDuration } from "../period";

describe("formatDuration", () => {
  it("formats sub-year spans in months", () => {
    expect(formatDuration("01.2026", "03.2026")).toBe("3m");
  });
  it("formats whole years", () => {
    expect(formatDuration("2022", "2023")).toBe("2y"); // 24 months inclusive
  });
  it("formats year + month spans", () => {
    expect(formatDuration("01.2022", "02.2023")).toBe("1y 2m");
  });
});
