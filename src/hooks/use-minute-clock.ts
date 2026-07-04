import { useEffect, useState } from "react";

export default function useMinuteClock<T>(compute: () => T, deps: readonly unknown[] = []): T {
  const [state, setState] = useState(compute);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const now = new Date();
      const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
      timeout = setTimeout(() => {
        setState(compute());
        schedule();
      }, msToNextMinute);
    };
    schedule();
    return () => clearTimeout(timeout);
    // compute is intentionally caller-scoped; deps controls resubscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
