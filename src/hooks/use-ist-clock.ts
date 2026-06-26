import { useEffect, useState } from "react";

function computeIST() {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const time = ist.toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit" });

  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const userNow = new Date(now.toLocaleString("en-US", { timeZone: userTz }));
  const userOffset = Math.round((ist.getTime() - userNow.getTime()) / 3_600_000);

  return { time, userOffset };
}

// Lazy initializer = first paint already has the real time (no empty "" flash).
// Server computes its own value; render the clock with suppressHydrationWarning.
// ponytail: literal pre-paint <script> adds nothing here — the clock lives inside
// a client-only maplibre widget that paints nothing before JS anyway.
// The display is HH:MM, so we tick on the minute boundary, not every second.
export default function useISTClock() {
  const [state, setState] = useState(computeIST);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const now = new Date();
      const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
      timeout = setTimeout(() => {
        setState(computeIST());
        schedule();
      }, msToNextMinute);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, []);

  return state;
}
