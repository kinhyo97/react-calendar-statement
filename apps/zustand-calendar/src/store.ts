import { create } from "zustand";

type CalendarStore = {
  count: number;
  increase: () => void;
  reset: () => void;
};

export const useCalendarStore = create<CalendarStore>((set) => ({
  count: 0,
  increase: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 })
}));
