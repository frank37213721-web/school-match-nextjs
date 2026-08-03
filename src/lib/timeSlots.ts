export type TimeSlot = {
  dayOfWeek: string;
  startHour: number;
  endHour: number;
};

export function formatTimeSlot(slot: TimeSlot): string {
  const pad = (h: number) => String(h).padStart(2, "0");
  return `${slot.dayOfWeek} ${pad(slot.startHour)}:00 ~ ${pad(slot.endHour)}:00`;
}

export function formatTimeSlots(slots: TimeSlot[]): string {
  if (slots.length === 0) return "（未設定時段）";
  return slots.map(formatTimeSlot).join("、");
}
