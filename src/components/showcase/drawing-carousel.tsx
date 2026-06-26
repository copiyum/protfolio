"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./drawing-carousel.module.css";

const CAROUSEL_INTERVAL = 3500; // ms — autoplay cadence

const images: { src: string; artist?: string }[] = [
  { src: "/assets/bongo-cat/none.png", artist: "Shubu" },
  { src: "/assets/bongo-cat/left.png", artist: "Shubu" },
  { src: "/assets/bongo-cat/right.png", artist: "Shubu" },
];

export default function DrawingCarousel({ className = "" }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % images.length), CAROUSEL_INTERVAL);
    return () => clearInterval(t);
  }, []);

  const handleNavigation = (direction: "prev" | "next") => {
    setIsAnimating(true);
    
    // Shorter animation duration for snappier feel
    const clear = setTimeout(() => {
      setIsAnimating(false);
      clearTimeout(clear);
    }, 600);

    if (direction === "prev") {
      setIndex((i) => (i - 1 + images.length) % images.length);
    } else {
      setIndex((i) => (i + 1) % images.length);
    }
  };

  return (
    <div className={"group relative w-full h-[225px] rounded-none border border-[color:var(--foreground)]/10 bg-background p-3 " + className}>
      <div className="relative h-full w-full bg-background flex items-center justify-center">
        <div className="w-full mx-3 flex flex-col items-center justify-center gap-3">
          <div className="relative h-[160px] w-full rounded-sm border border-[color:var(--foreground)]/10 overflow-hidden flex flex-col items-center justify-start bg-[color:var(--background)]/95 shadow-lg pt-4">
            <div className="relative h-[100px] w-[85%] bg-gray-50 border border-gray-200 flex items-center justify-center mb-4">
              <Image
                src={images[index].src}
                alt={`drawing-${index}`}
                fill
                sizes="(max-width: 768px) 50vw, 200px"
                className="object-contain filter sepia-20 contrast-110 brightness-105 saturate-90"
              />
            </div>
            
            <div className="text-[11px] text-[color:var(--foreground)]/70 text-center">
              by: {images[index].artist}
            </div>
          </div>
          
          {/* Centered controls below the polaroid */}
          <div className="flex items-center justify-center gap-3">
            {/* PREV */}
            <button
              aria-label="previous"
              onClick={() => handleNavigation("prev")}
              className={`${styles.round} pointer-events-auto`}
            >
              <div className={styles.cta}>
                <div className={`${styles.arrow} ${styles.prev} ${isAnimating ? styles.bounceAlphaPrev : ""}`} />
              </div>
            </button>
            
            {/* NEXT */}
            <button
              aria-label="next"
              onClick={() => handleNavigation("next")}
              className={`${styles.round} pointer-events-auto`}
            >
              <div className={styles.cta}>
                <div className={`${styles.arrow} ${isAnimating ? styles.bounceAlpha : ""}`} />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}