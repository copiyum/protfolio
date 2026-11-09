import { useSyncExternalStore } from "react";

// One shared minute ticker: fires on each wall-clock minute boundary.
function subscribeMinute(onTick: () => void) {
  let timeout: ReturnType<typeof setTimeout>;
  const schedule = () => {
    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    timeout = setTimeout(() => {
      onTick();
      schedule();
    }, msToNextMinute);
  };
  schedule();
  return () => clearTimeout(timeout);
}

const getMinuteSnapshot = () => Math.floor(Date.now() / 60_000);
const getServerMinuteSnapshot = () => null;

// Returns null during SSR and hydration, then the computed value on the client,
// refreshed every minute. Public pages are statically cached, so a server-side
// time would be both stale and a hydration mismatch (server is UTC, visitors aren't).
// `compute` is cheap (a couple of Intl calls), so it simply runs per render.
export default function useMinuteClock<T>(compute: () => T): T | null {
  const minute = useSyncExternalStore(subscribeMinute, getMinuteSnapshot, getServerMinuteSnapshot);
  return minute === null ? null : compute();
}
