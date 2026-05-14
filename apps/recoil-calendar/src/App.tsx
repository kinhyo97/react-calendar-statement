import { useRecoilState } from "recoil";
import { useAuthSession, useCalendarCategories, useCalendarEvents } from "@calendar/api";
import { CalendarScreen, LoginScreen } from "@calendar/ui";
import {
  filterState,
  formState,
  isDarkModeState,
  isFormOpenState,
  selectedDateState,
  selectedEventState,
  visibleMonthState
} from "./atoms";

export function App() {
  const auth = useAuthSession();
  const calendarEvents = useCalendarEvents(auth.token);
  const calendarCategories = useCalendarCategories(auth.token);
  const [visibleMonth, setVisibleMonth] = useRecoilState(visibleMonthState);
  const [selectedDate, setSelectedDate] = useRecoilState(selectedDateState);
  const [selectedEvent, setSelectedEvent] = useRecoilState(selectedEventState);
  const [filter, setFilter] = useRecoilState(filterState);
  const [isFormOpen, setIsFormOpen] = useRecoilState(isFormOpenState);
  const [isDarkMode, setIsDarkMode] = useRecoilState(isDarkModeState);
  const [form, setForm] = useRecoilState(formState);

  if (!auth.user) {
    return <LoginScreen onLogin={auth.login} isLoading={auth.isLoggingIn || auth.isCheckingAuth} error={auth.loginError} />;
  }

  return (
    <CalendarScreen
      title="Recoil 캘린더"
      stateLabel="Recoil + TanStack Query"
      visibleMonth={visibleMonth}
      selectedDate={selectedDate}
      selectedEvent={selectedEvent}
      filter={filter}
      isFormOpen={isFormOpen}
      form={form}
      events={calendarEvents.events}
      categories={calendarCategories.categories}
      user={auth.user}
      isLoading={calendarEvents.isLoading || calendarCategories.isLoading}
      isError={calendarEvents.isError || calendarCategories.isError}
      isSaving={calendarEvents.isSaving || calendarCategories.isSaving}
      isDarkMode={isDarkMode}
      onLogout={auth.logout}
      onDarkModeToggle={() => setIsDarkMode((value) => !value)}
      onVisibleMonthChange={setVisibleMonth}
      onSelectedDateChange={setSelectedDate}
      onSelectedEventChange={setSelectedEvent}
      onFilterChange={setFilter}
      onFormOpenChange={setIsFormOpen}
      onFormChange={setForm}
      onCategoryCreate={(category) => calendarCategories.createCategory(category)}
      onCategoryChange={(category) => calendarCategories.updateCategory(category)}
      onCreateEvent={(event) => calendarEvents.createEvent(event)}
      onUpdateEvent={(event) => calendarEvents.updateEvent(event)}
      onDeleteEvent={(id) => calendarEvents.deleteEvent(id)}
    />
  );
}
