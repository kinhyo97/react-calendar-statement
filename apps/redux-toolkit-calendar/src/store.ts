import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CalendarEvent, CalendarFilter, EventFormValue } from "@calendar/types";
import { createEmptyForm } from "@calendar/ui";
import { toDateKey } from "@calendar/utils";

type CalendarState = {
  visibleMonth: string;
  selectedDate: string;
  selectedEvent: CalendarEvent | null;
  filter: CalendarFilter;
  isFormOpen: boolean;
  isDarkMode: boolean;
  form: EventFormValue;
};

const initialState: CalendarState = {
  visibleMonth: toDateKey(new Date()),
  selectedDate: toDateKey(new Date()),
  selectedEvent: null,
  filter: { query: "", categoryId: "all" },
  isFormOpen: false,
  isDarkMode: false,
  form: createEmptyForm()
};

const calendarSlice = createSlice({
  name: "calendar",
  initialState,
  reducers: {
    setVisibleMonth(state, action: PayloadAction<Date>) {
      state.visibleMonth = toDateKey(action.payload);
    },
    setSelectedDate(state, action: PayloadAction<string>) {
      state.selectedDate = action.payload;
    },
    setSelectedEvent(state, action: PayloadAction<CalendarEvent | null>) {
      state.selectedEvent = action.payload;
    },
    setFilter(state, action: PayloadAction<CalendarFilter>) {
      state.filter = action.payload;
    },
    setIsFormOpen(state, action: PayloadAction<boolean>) {
      state.isFormOpen = action.payload;
    },
    toggleDarkMode(state) {
      state.isDarkMode = !state.isDarkMode;
    },
    setForm(state, action: PayloadAction<EventFormValue>) {
      state.form = action.payload;
    }
  }
});

export const calendarActions = calendarSlice.actions;

export const store = configureStore({
  reducer: {
    calendar: calendarSlice.reducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
