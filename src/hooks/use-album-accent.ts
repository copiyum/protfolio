"use client";

import { useEffect, useState } from "react";
import { extractAlbumAccent } from "@/lib/album-accent";

export default function useAlbumAccent(src: string | null | undefined) {
  const [accent, setAccent] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAccent(null);

    if (!src) return;

    extractAlbumAccent(src).then((color) => {
      if (!cancelled) setAccent(color);
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return accent;
}
