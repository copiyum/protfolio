"use client";

import { useEffect, useState } from "react";
import { extractAlbumAccent } from "@/lib/album-accent";

export default function useAlbumAccent(src: string | null | undefined) {
  const [result, setResult] = useState<{ src: string; accent: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!src) return;

    extractAlbumAccent(src).then((color) => {
      if (!cancelled) setResult({ src, accent: color });
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return result && result.src === src ? result.accent : null;
}
