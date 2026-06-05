export interface CalendarConfig {
  timezone: string;
  workdayStart: number;
  workdayEnd: number;
  meetingDuration: number;
  bufferMinutes: number;
  daysAhead: number;
}

export interface TimeSlot {
  date: string;
  time: string;
  datetime: string;
  available: boolean;
}

export function getAvailableSlots(config: CalendarConfig, bookedSlots: string[]): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const booked = new Set(bookedSlots);
  const step = config.meetingDuration + config.bufferMinutes;
  const base = Date.now();
  let daysFound = 0;
  let offset = 1;

  while (daysFound < config.daysAhead) {
    const d = new Date(base + offset * 86400000);
    offset++;
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;

    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    const dateStr = `${yr}-${mo}-${da}`;

    let totalMin = config.workdayStart * 60;
    while (totalMin + config.meetingDuration <= config.workdayEnd * 60) {
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const datetime = `${dateStr}T${timeStr}:00`;
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      const display = `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
      slots.push({ date: dateStr, time: display, datetime, available: !booked.has(datetime) });
      totalMin += step;
    }
    daysFound++;
  }
  return slots;
}

export function formatSlotLabel(slot: TimeSlot): string {
  const parts = slot.datetime.split("T")[0].split("-");
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()} · ${slot.time}`;
}
