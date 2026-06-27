"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import styles from "./drawing-carousel.module.css";
import useReducedMotion from "@/hooks/use-reduced-motion";

const CAROUSEL_INTERVAL = 3500; // ms — autoplay cadence

const images: { src: string; artist?: string }[] = [
  { src: "/assets/bongo-cat/none.png", artist: "Shubu" },
  { src: "/assets/bongo-cat/left.png", artist: "Shubu" },
  { src: "/assets/bongo-cat/right.png", artist: "Shubu" },
];

export default function DrawingCarousel({ className = "" }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setPageVisible(document.visibilityState === "visible");
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || isPaused || !inView || !pageVisible) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % images.length), CAROUSEL_INTERVAL);
    return () => clearInterval(t);
  }, [inView, isPaused, pageVisible, reducedMotion]);

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
    <div
      ref={rootRef}
      className={"group relative h-[260px] w-full rounded-[18px] bg-[color:var(--background)]/48 p-4 " + className}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className="relative flex h-full w-full items-center justify-center">
        <div className="flex w-full flex-col items-center justify-center gap-4">
          <div className="relative flex h-[184px] w-full flex-col items-center justify-start overflow-hidden rounded-2xl border border-[color:var(--foreground)]/8 bg-[color:var(--foreground)]/[0.025] pt-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="relative mb-4 flex h-[116px] w-[84%] items-center justify-center rounded-sm border border-gray-200 bg-gray-50">
              {images.map((image, imageIndex) => (
                <Image
                  key={image.src}
                  src={image.src}
                  alt={`drawing-${imageIndex}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 200px"
                  className={`${styles.carouselImage} ${imageIndex === index ? styles.carouselImageActive : ""}`}
                  aria-hidden={imageIndex !== index}
                />
              ))}
            </div>
            
            <div className="text-center text-[11px] text-[color:var(--foreground)]/60">
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
