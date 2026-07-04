import { describe, expect, it } from "vitest";
import { HttpsUrl, InternalPath, OptionalHttpsUrl } from "@/lib/admin/schema/url";

describe("admin URL schemas", () => {
  it("accepts https URLs", () => {
    expect(HttpsUrl.parse("https://example.com/path")).toBe("https://example.com/path");
  });

  it("rejects scriptable URLs", () => {
    expect(() => HttpsUrl.parse("javascript:alert(1)")).toThrow();
    expect(() => HttpsUrl.parse("data:text/html,<h1>x</h1>")).toThrow();
    expect(() => OptionalHttpsUrl.parse("http://example.com")).toThrow();
  });

  it("accepts relative internal paths for navigation", () => {
    expect(InternalPath.parse("/projects")).toBe("/projects");
  });

  it("rejects external and protocol-relative navigation targets", () => {
    expect(() => InternalPath.parse("https://example.com")).toThrow();
    expect(() => InternalPath.parse("//example.com")).toThrow();
  });

  it("rejects dot-segment internal paths", () => {
    expect(() => InternalPath.parse("/../../../etc/passwd")).toThrow();
    expect(() => OptionalHttpsUrl.parse("/projects/../admin")).toThrow();
  });
});
