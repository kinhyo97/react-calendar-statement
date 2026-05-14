import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";

type CalendarState = {
  count: number;
};

const initialState: CalendarState = {
  count: 0
};

const calendarSlice = createSlice({
  name: "calendar",
  initialState,
  reducers: {
    increase(state) {
      state.count += 1;
    },
    setCount(state, action: PayloadAction<number>) {
      state.count = action.payload;
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
