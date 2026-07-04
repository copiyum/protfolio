import useMinuteClock from "./use-minute-clock";

function dateInZone(now: Date, timeZone: string): Date {
  return new Date(now.toLocaleString("en-US", { timeZone }));
}

function formatOffset(minutes: number): string {
  if (minutes === 0) return "same timezone";
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  const parts = [
    hours ? `${hours}h` : "",
    mins ? `${mins}m` : "",
  ].filter(Boolean);
  return `${parts.join(" ")} ${minutes > 0 ? "ahead of" : "behind"} you`;
}

function computeClock(timeZone: string) {
  const now = new Date();
  const time = now.toLocaleTimeString("en-GB", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const targetNow = dateInZone(now, timeZone);
  const userNow = dateInZone(now, userTimeZone);
  const offsetMinutes = Math.round((targetNow.getTime() - userNow.getTime()) / 60_000);

  return { time, offsetLabel: formatOffset(offsetMinutes) };
}

export default function useTimezoneClock(timeZone: string) {
  return useMinuteClock(() => computeClock(timeZone), [timeZone]);
}
