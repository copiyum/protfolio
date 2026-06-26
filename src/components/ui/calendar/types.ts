export interface CalendarProps {
  selectedDate?: Date; // default: today (only used to compute week)
  className?: string;
  // future: controlled mode
  value?: Date;
  onChange?: (date: Date) => void;
}

export type DOWKey = 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
