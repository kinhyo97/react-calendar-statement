import type { CalendarEvent, CalendarFilter } from "@calendar/types";

export type CalendarDay = {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export type CalendarWeek = CalendarDay[];

export type WeekEventBar = {
  event: CalendarEvent;
  lane: number;
  startIndex: number;
  span: number;
  isClippedStart: boolean;
  isClippedEnd: boolean;
};

const pad = (value: number) => String(value).padStart(2, "0");

export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const fromDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const monthKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

export const monthTitle = (date: Date) =>
  new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(date);

export const addMonths = (date: Date, amount: number) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);

export const createMonthDays = (visibleMonth: Date): CalendarDay[] => {
  const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  const today = toDateKey(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      date: toDateKey(date),
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === visibleMonth.getMonth(),
      isToday: toDateKey(date) === today
    };
  });
};

export const createMonthWeeks = (visibleMonth: Date): CalendarWeek[] => {
  const days = createMonthDays(visibleMonth);

  return Array.from({ length: 6 }, (_, index) => days.slice(index * 7, index * 7 + 7));
};

export const filterEvents = (events: CalendarEvent[], filter: CalendarFilter) => {
  const query = filter.query.trim().toLowerCase();

  return events.filter((event) => {
    const matchesCategory = filter.categoryId === "all" || event.categoryId === filter.categoryId;
    const matchesQuery =
      query.length === 0 ||
      event.title.toLowerCase().includes(query) ||
      event.memo?.toLowerCase().includes(query);

    return matchesCategory && matchesQuery;
  });
};

export const groupEventsByDate = (events: CalendarEvent[]) =>
  events.reduce<Record<string, CalendarEvent[]>>((grouped, event) => {
    grouped[event.startDate] = [...(grouped[event.startDate] ?? []), event];
    return grouped;
  }, {});

export const eventOccursOnDate = (event: CalendarEvent, date: string) =>
  event.startDate <= date && event.endDate >= date;

export const normalizeEventRange = <T extends { startDate: string; endDate: string }>(event: T): T =>
  event.startDate <= event.endDate ? event : { ...event, startDate: event.endDate, endDate: event.startDate };

export const layoutWeekEvents = (week: CalendarWeek, events: CalendarEvent[], maxLanes = 4) => {
  const weekStart = week[0]?.date;
  const weekEnd = week[week.length - 1]?.date;

  if (!weekStart || !weekEnd) {
    return { bars: [], hiddenCount: 0 };
  }

  const candidates = events
    .map(normalizeEventRange)
    .filter((event) => event.startDate <= weekEnd && event.endDate >= weekStart)
    .sort((a, b) => {
      const startCompare = a.startDate.localeCompare(b.startDate);
      if (startCompare !== 0) {
        return startCompare;
      }

      const durationA = fromDateKey(a.endDate).getTime() - fromDateKey(a.startDate).getTime();
      const durationB = fromDateKey(b.endDate).getTime() - fromDateKey(b.startDate).getTime();
      return durationB - durationA || a.title.localeCompare(b.title);
    });

  const laneEnds: string[] = [];
  const bars: WeekEventBar[] = [];
  let hiddenCount = 0;

  for (const event of candidates) {
    const clippedStart = event.startDate < weekStart ? weekStart : event.startDate;
    const clippedEnd = event.endDate > weekEnd ? weekEnd : event.endDate;
    const startIndex = week.findIndex((day) => day.date === clippedStart);
    const endIndex = week.findIndex((day) => day.date === clippedEnd);

    if (startIndex < 0 || endIndex < 0) {
      continue;
    }

    const lane = laneEnds.findIndex((laneEnd) => laneEnd < clippedStart);
    const resolvedLane = lane === -1 ? laneEnds.length : lane;

    if (resolvedLane >= maxLanes) {
      hiddenCount += 1;
      continue;
    }

    laneEnds[resolvedLane] = clippedEnd;
    bars.push({
      event,
      lane: resolvedLane,
      startIndex,
      span: endIndex - startIndex + 1,
      isClippedStart: event.startDate < weekStart,
      isClippedEnd: event.endDate > weekEnd
    });
  }

  return { bars, hiddenCount };
};
