import { create } from "zustand";
import type { CalendarEvent, CalendarFilter, EventFormValue } from "@calendar/types";
import { createEmptyForm } from "@calendar/ui";
import { toDateKey } from "@calendar/utils";

type CalendarStore = {
  visibleMonth: Date;
  selectedDate: string;
  selectedEvent: CalendarEvent | null;
  filter: CalendarFilter;
  isFormOpen: boolean;
  isDarkMode: boolean;
  form: EventFormValue;
  setVisibleMonth: (visibleMonth: Date) => void;
  setSelectedDate: (selectedDate: string) => void;
  setSelectedEvent: (selectedEvent: CalendarEvent | null) => void;
  setFilter: (filter: CalendarFilter) => void;
  setIsFormOpen: (isFormOpen: boolean) => void;
  toggleDarkMode: () => void;
  setForm: (form: EventFormValue) => void;
};

export const useCalendarStore = create<CalendarStore>((set) => ({
  visibleMonth: new Date(),
  selectedDate: toDateKey(new Date()),
  selectedEvent: null,
  filter: { query: "", categoryId: "all" },
  isFormOpen: false,
  isDarkMode: false,
  form: createEmptyForm(),
  setVisibleMonth: (visibleMonth) => set({ visibleMonth }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setSelectedEvent: (selectedEvent) => set({ selectedEvent }),
  setFilter: (filter) => set({ filter }),
  setIsFormOpen: (isFormOpen) => set({ isFormOpen }),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setForm: (form) => set({ form })
}));
