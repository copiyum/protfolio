import React from "react";

interface Props {
  /** Monochrome SVG markup (fill="currentColor"). */
  svgContent?: string;
  color?: string;
  size?: number;
}

// Renders trusted, developer-authored monochrome SVG and tints it via `color`
// (the SVG inherits it through currentColor). Sizing is handled by the
// `.tech-icon svg` rule in globals.css.
export default function TechIcon({ svgContent, color, size = 28 }: Props) {
  return (
    <div
      className="tech-icon"
      style={{ color, width: size, height: size, display: "inline-block", lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: svgContent ?? "" }}
    />
  );
}
