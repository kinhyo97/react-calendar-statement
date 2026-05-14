import { atom } from "recoil";
import type { CalendarEvent, CalendarFilter, EventFormValue } from "@calendar/types";
import { createEmptyForm } from "@calendar/ui";
import { toDateKey } from "@calendar/utils";

export const visibleMonthState = atom<Date>({
  key: "visibleMonthState",
  default: new Date()
});

export const selectedDateState = atom<string>({
  key: "selectedDateState",
  default: toDateKey(new Date())
});

export const selectedEventState = atom<CalendarEvent | null>({
  key: "selectedEventState",
  default: null
});

export const filterState = atom<CalendarFilter>({
  key: "filterState",
  default: { query: "", categoryId: "all" }
});

export const isFormOpenState = atom<boolean>({
  key: "isFormOpenState",
  default: false
});

export const isDarkModeState = atom<boolean>({
  key: "isDarkModeState",
  default: false
});

export const formState = atom<EventFormValue>({
  key: "formState",
  default: createEmptyForm()
});
