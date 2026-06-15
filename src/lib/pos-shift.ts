const SHIFT_KEY = "kw_pos_shift_v1";

type ShiftRecord = {
  status: "Open";
  openedAt: string;
};

export function loadShiftStatus(): "Closed" | "Open" {
  if (typeof window === "undefined") return "Closed";
  try {
    const raw = localStorage.getItem(SHIFT_KEY);
    if (!raw) return "Closed";
    const data = JSON.parse(raw) as ShiftRecord;
    if (data.status !== "Open" || !data.openedAt) return "Closed";
    const opened = new Date(data.openedAt);
    if (Number.isNaN(opened.getTime())) return "Closed";
    // Auto-close when the calendar day changes
    if (opened.toDateString() !== new Date().toDateString()) {
      localStorage.removeItem(SHIFT_KEY);
      return "Closed";
    }
    return "Open";
  } catch {
    return "Closed";
  }
}

export function openShift(): "Open" {
  const record: ShiftRecord = { status: "Open", openedAt: new Date().toISOString() };
  localStorage.setItem(SHIFT_KEY, JSON.stringify(record));
  return "Open";
}

export function closeShift(): "Closed" {
  localStorage.removeItem(SHIFT_KEY);
  return "Closed";
}

export function getShiftOpenedAt(): Date | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SHIFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ShiftRecord;
    const opened = new Date(data.openedAt);
    return Number.isNaN(opened.getTime()) ? null : opened;
  } catch {
    return null;
  }
}
