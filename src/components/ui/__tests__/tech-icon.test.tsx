import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TechIcon from "../tech-icon";
import { isSafeSvgIcon } from "@/lib/admin/schema/tech-stack";

describe("TechIcon", () => {
  it("renders SVG markup as an isolated image instead of document HTML", () => {
    const { container } = render(
      <TechIcon svgContent={'<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>'} />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
  });

  it("rejects executable and externally-referencing SVG fields", () => {
    expect(isSafeSvgIcon('<svg onload="alert(1)"></svg>')).toBe(false);
    expect(isSafeSvgIcon('<svg><script>alert(1)</script></svg>')).toBe(false);
    expect(isSafeSvgIcon('<svg><use href="https://evil.example/x.svg#x"/></svg>')).toBe(false);
    expect(isSafeSvgIcon('<svg><foreignObject>unsafe</foreignObject></svg>')).toBe(false);
  });
});
