import Image from "next/image";

interface Props {
  /** Sanitized SVG markup rendered in an isolated image context. */
  svgContent?: string;
  color?: string;
  size?: number;
}

export default function TechIcon({ svgContent, color, size = 28 }: Props) {
  const tintedSvg = svgContent?.replaceAll("currentColor", color ?? "#9ca3af");
  const source = tintedSvg
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(tintedSvg)}`
    : null;

  return (
    <div
      className="tech-icon"
      style={{ color, width: size, height: size, display: "inline-block", lineHeight: 0 }}
    >
      {source ? (
        <Image src={source} alt="" aria-hidden width={size} height={size} unoptimized />
      ) : null}
    </div>
  );
}
