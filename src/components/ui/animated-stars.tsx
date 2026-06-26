"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

// Physics + distribution tuning — single-use, so it lives with its only consumer.
const STAR_DENSITY_DEFAULT = 0.00023;
const STAR_SPREAD_X = 0.22;
const STAR_SPREAD_Y_FACTOR = 1.8;
const STAR_RADIUS_MIN = 0.25;
const STAR_RADIUS_MAX = 1.4;
const STAR_ALPHA_MIN = 0.7;
const STAR_ALPHA_MAX = 1.0;
const STAR_VELOCITY_X_RANGE = 0.25;
const STAR_VELOCITY_Y_RANGE = 0.18;
const STAR_FRICTION = 0.96;
const STAR_RADIUS_INFLUENCE = 0.15;
const STAR_ADVECT_SCALE = 0.0003;
const STAR_SWIRL_SCALE = 0.00001;
const STAR_WIND_X_BASE = 0.01;
const STAR_WIND_Y_BASE = 0.01;
const STAR_WIND_X_AMPLITUDE = 0.02;
const STAR_WIND_Y_AMPLITUDE = 0.02;
const STAR_WIND_FREQ_X = 0.07;
const STAR_WIND_FREQ_Y = 0.11;
const STAR_BROWNIAN_SCALE = 0.3;
const STAR_TWINKLE_SPEED = 0.02;

type Star = { x: number; y: number; r: number; a: number; av: number; twinkle: number; vx: number; vy: number };

export default function AnimatedStars({ density = STAR_DENSITY_DEFAULT }: { density?: number }) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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
    const reduce = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // regen stars based on area
      const count = Math.floor(w * h * density);
      const stars: Star[] = [];
      const randNorm = () => {
        // Box-Muller transform
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      };
      for (let i = 0; i < count; i++) {
        // Concentrate horizontally around center (top middle origin)
        const sdX = w * STAR_SPREAD_X; // spread
        let x = w / 2 + randNorm() * sdX;
        if (x < -5) x = Math.random() * w; if (x > w + 5) x = Math.random() * w;
        // Bias vertical distribution towards the top, taper off towards middle
        const y = h * Math.pow(Math.random(), STAR_SPREAD_Y_FACTOR) * 0.6;
        stars.push({
          x,
          y,
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

    function draw() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const stars = starsRef.current;
      // mouse in pixels and velocity since last frame
      const mx = mouseRef.current.x * w;
      const my = mouseRef.current.y * h;
      const pmx = prevMouseRef.current.x * w;
      const pmy = prevMouseRef.current.y * h;
      const mvx = mx - pmx;
      const mvy = my - pmy;
      prevMouseRef.current.x = mouseRef.current.x;
      prevMouseRef.current.y = mouseRef.current.y;

      const baseFriction = STAR_FRICTION;
      const radius = Math.min(w, h) * STAR_RADIUS_INFLUENCE; // Reduced influence radius
      const advectScale = STAR_ADVECT_SCALE; // Reduced mouse advection
      const swirlScale = STAR_SWIRL_SCALE; // Reduced swirl effect
      const mouseSpeed = Math.hypot(mvx, mvy);

      // Reduced global wind
      const t = performance.now() * 0.001;
      const windX = Math.sin(t * STAR_WIND_FREQ_X) * STAR_WIND_X_AMPLITUDE + STAR_WIND_X_BASE;
      const windY = Math.cos(t * STAR_WIND_FREQ_Y) * STAR_WIND_Y_AMPLITUDE + STAR_WIND_Y_BASE;

      for (const s of stars) {
        // Add Brownian motion (random walk)
        const brownianX = (Math.random() - 0.5) * STAR_BROWNIAN_SCALE;
        const brownianY = (Math.random() - 0.5) * STAR_BROWNIAN_SCALE;

        // distance influence (gaussian falloff) - reduced
        const dxm = s.x - mx;
        const dym = s.y - my;
        const d2 = dxm * dxm + dym * dym;
        const influence = Math.exp(-d2 / (radius * radius)) * 0.3; // Reduced influence

        // Reduced swirl velocity
        const swirlX = -dym * swirlScale * mouseSpeed * influence;
        const swirlY = dxm * swirlScale * mouseSpeed * influence;

        // Reduced advection
        s.vx += swirlX + mvx * advectScale * influence + windX + brownianX;
        s.vy += swirlY + mvy * advectScale * influence + windY + brownianY;

        // friction and drift update
        s.vx *= baseFriction;
        s.vy *= baseFriction;
        s.x += s.vx;
        s.y += s.vy;
        // wrap edges
  if (s.x < -2) s.x = w + 2; if (s.x > w + 2) s.x = -2;
  if (s.y < -2) s.y = h + 2; if (s.y > h + 2) s.y = -2;

        // twinkle faster
        s.a += s.av * STAR_TWINKLE_SPEED;
        if (s.a < 0) { s.a = 0; s.av *= -1; }
        if (s.a > 1) { s.a = 1; s.av *= -1; }
        const alpha = Math.max(0, Math.min(1, s.a)) * s.twinkle;
        const isDark = themeRef.current === "dark";
        const starColor = isDark ? '255, 255, 255' : '130, 130, 130';
        ctx.fillStyle = `rgba(${starColor}, ${reduce ? 0.35 : alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    draw();
    const onMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      mouseRef.current.x = e.clientX / innerWidth;
      mouseRef.current.y = e.clientY / innerHeight;
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', onMove);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
  className="pointer-events-none fixed inset-0 -z-10 w-full h-full"
      aria-hidden
    />
  );
}
