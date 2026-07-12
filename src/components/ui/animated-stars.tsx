"use client";
import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import useReducedMotion from "@/hooks/use-reduced-motion";
import useHasMounted from "@/hooks/use-has-mounted";

const STAR_DENSITY_DEFAULT = 0.000184;
const STAR_RADIUS_MIN = 0.25;
const STAR_RADIUS_MAX = 1.4;
const STAR_ALPHA_MIN = 0.7;
const STAR_ALPHA_MAX = 1.0;
const STAR_VELOCITY_X_RANGE = 0.12;
const STAR_VELOCITY_Y_RANGE = 0.08;
const STAR_FRICTION = 0.975;
const STAR_RADIUS_INFLUENCE = 0.15;
const STAR_ADVECT_SCALE = 0.0003;
const STAR_SWIRL_SCALE = 0.00001;
const STAR_WIND_X_BASE = 0.004;
const STAR_WIND_Y_BASE = 0.004;
const STAR_WIND_X_AMPLITUDE = 0.009;
const STAR_WIND_Y_AMPLITUDE = 0.009;
const STAR_WIND_FREQ_X = 0.035;
const STAR_WIND_FREQ_Y = 0.055;
const STAR_BROWNIAN_SCALE = 0.12;
const STAR_TWINKLE_SPEED = 0.009;

type Star = { x: number; y: number; r: number; a: number; av: number; twinkle: number; vx: number; vy: number };

export default function AnimatedStars({ density = STAR_DENSITY_DEFAULT }: { density?: number }) {
  const { theme, resolvedTheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const mounted = useHasMounted();
  const themeRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    themeRef.current = mounted ? resolvedTheme : theme;
  }, [theme, resolvedTheme, mounted]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Star[]>([]);
  const mouseRef = useRef({ x: 0.5, y: 0.2 });
  const prevMouseRef = useRef({ x: 0.5, y: 0.2 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: true })!;
    let active = !reducedMotion && document.visibilityState === "visible";

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.floor(w * h * density);
      const stars: Star[] = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * (STAR_RADIUS_MAX - STAR_RADIUS_MIN) + STAR_RADIUS_MIN,
          a: Math.random(),
          av: (Math.random() * 1.2 + 0.4) * (Math.random() < 0.5 ? -1 : 1),
          twinkle: Math.random() * (STAR_ALPHA_MAX - STAR_ALPHA_MIN) + STAR_ALPHA_MIN,
          vx: (Math.random() - 0.5) * STAR_VELOCITY_X_RANGE,
          vy: (Math.random() - 0.5) * STAR_VELOCITY_Y_RANGE,
        });
      }
      starsRef.current = stars;
    }

    function drawScene(advance: boolean) {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const stars = starsRef.current;
      const mx = mouseRef.current.x * w;
      const my = mouseRef.current.y * h;
      const pmx = prevMouseRef.current.x * w;
      const pmy = prevMouseRef.current.y * h;
      const mvx = mx - pmx;
      const mvy = my - pmy;
      prevMouseRef.current.x = mouseRef.current.x;
      prevMouseRef.current.y = mouseRef.current.y;

      const radius = Math.min(w, h) * STAR_RADIUS_INFLUENCE;
      const mouseSpeed = Math.hypot(mvx, mvy);
      const t = performance.now() * 0.001;
      const windX = Math.sin(t * STAR_WIND_FREQ_X) * STAR_WIND_X_AMPLITUDE + STAR_WIND_X_BASE;
      const windY = Math.cos(t * STAR_WIND_FREQ_Y) * STAR_WIND_Y_AMPLITUDE + STAR_WIND_Y_BASE;

      for (const s of stars) {
        if (advance) {
          const brownianX = (Math.random() - 0.5) * STAR_BROWNIAN_SCALE;
          const brownianY = (Math.random() - 0.5) * STAR_BROWNIAN_SCALE;
          const dxm = s.x - mx;
          const dym = s.y - my;
          const d2 = dxm * dxm + dym * dym;
          const influence = Math.exp(-d2 / (radius * radius)) * 0.3;
          const swirlX = -dym * STAR_SWIRL_SCALE * mouseSpeed * influence;
          const swirlY = dxm * STAR_SWIRL_SCALE * mouseSpeed * influence;

          s.vx += swirlX + mvx * STAR_ADVECT_SCALE * influence + windX + brownianX;
          s.vy += swirlY + mvy * STAR_ADVECT_SCALE * influence + windY + brownianY;
          s.vx *= STAR_FRICTION;
          s.vy *= STAR_FRICTION;
          s.x += s.vx;
          s.y += s.vy;
          if (s.x < -2) s.x = w + 2;
          if (s.x > w + 2) s.x = -2;
          if (s.y < -2) s.y = h + 2;
          if (s.y > h + 2) s.y = -2;

          s.a += s.av * STAR_TWINKLE_SPEED;
          if (s.a < 0) { s.a = 0; s.av *= -1; }
          if (s.a > 1) { s.a = 1; s.av *= -1; }
        }

        const alpha = Math.max(0, Math.min(1, s.a)) * s.twinkle;
        const starColor = themeRef.current === "dark" ? "255, 255, 255" : "130, 130, 130";
        ctx.fillStyle = `rgba(${starColor}, ${reducedMotion ? Math.min(0.42, alpha) : alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function draw() {
      drawScene(true);
      rafRef.current = active ? requestAnimationFrame(draw) : null;
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    drawScene(false);
    if (active) rafRef.current = requestAnimationFrame(draw);

    const onMove = (event: MouseEvent) => {
      mouseRef.current.x = event.clientX / window.innerWidth;
      mouseRef.current.y = event.clientY / window.innerHeight;
    };
    const onVisibilityChange = () => {
      active = !reducedMotion && document.visibilityState === "visible";
      if (!active && rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (active && !rafRef.current) rafRef.current = requestAnimationFrame(draw);
    };
    if (!reducedMotion) window.addEventListener("mousemove", onMove);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [density, mounted, reducedMotion, resolvedTheme, theme]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[1] h-full w-full"
      aria-hidden
    />
  );
}
