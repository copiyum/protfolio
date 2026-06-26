// Pure CSS animation (.gradient-backdrop in globals.css) — no client JS, no timer.
export default function GradientBackdrop() {
  return <div aria-hidden className="gradient-backdrop pointer-events-none fixed inset-0 -z-20" />;
}
