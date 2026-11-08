import useMinuteClock from "./use-minute-clock";

function computeIST() {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const time = ist.toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit" });

  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const userNow = new Date(now.toLocaleString("en-US", { timeZone: userTz }));
  const userOffset = Math.round((ist.getTime() - userNow.getTime()) / 3_600_000);

  return { time, userOffset };
}

// Returns null during SSR/hydration (see useMinuteClock), then ticks on the
// minute boundary — the display is HH:MM.
export default function useISTClock() {
  return useMinuteClock(computeIST);
}
