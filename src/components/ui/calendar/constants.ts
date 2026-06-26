import type { DOWKey } from './types';

export const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

export const DAILY_MESSAGES: Record<(typeof DOW)[number], string> = {
  SUN: 'Preparing for work tomorrow 🥲',
  MON: 'Work 😡',
  TUE: 'Work some more 🙁',
  WED: 'Work because I have bills to pay 😐',
  THU: "Work but at least it's Thursday 🙂",
  FRI: 'Work today not tomorrow 🥲',
  SAT: 'No work 🥹',
} satisfies Record<DOWKey, string>;
