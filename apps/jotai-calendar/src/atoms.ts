import { atom } from "jotai";
import type { CalendarEvent, CalendarFilter, EventFormValue } from "@calendar/types";
import { createEmptyForm } from "@calendar/ui";
import { toDateKey } from "@calendar/utils";

export const visibleMonthAtom = atom(new Date());
export const selectedDateAtom = atom(toDateKey(new Date()));
export const selectedEventAtom = atom<CalendarEvent | null>(null);
export const filterAtom = atom<CalendarFilter>({ query: "", categoryId: "all" });
export const isFormOpenAtom = atom(false);
export const isDarkModeAtom = atom(false);
export const formAtom = atom<EventFormValue>(createEmptyForm());
