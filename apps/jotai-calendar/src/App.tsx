import { useAtom } from "jotai";
import { useAuthSession, useCalendarCategories, useCalendarEvents } from "@calendar/api";
import { CalendarScreen, LoginScreen } from "@calendar/ui";
import {
  filterAtom,
  formAtom,
  isDarkModeAtom,
  isFormOpenAtom,
  selectedDateAtom,
  selectedEventAtom,
  visibleMonthAtom
} from "./atoms";

export function App() {
  const auth = useAuthSession();
  const calendarEvents = useCalendarEvents(auth.token);
  const calendarCategories = useCalendarCategories(auth.token);
  const [visibleMonth, setVisibleMonth] = useAtom(visibleMonthAtom);
  const [selectedDate, setSelectedDate] = useAtom(selectedDateAtom);
  const [selectedEvent, setSelectedEvent] = useAtom(selectedEventAtom);
  const [filter, setFilter] = useAtom(filterAtom);
  const [isFormOpen, setIsFormOpen] = useAtom(isFormOpenAtom);
  const [isDarkMode, setIsDarkMode] = useAtom(isDarkModeAtom);
  const [form, setForm] = useAtom(formAtom);

  if (!auth.user) {
    return <LoginScreen onLogin={auth.login} isLoading={auth.isLoggingIn || auth.isCheckingAuth} error={auth.loginError} />;
  }

  return (
    <CalendarScreen
      title="Jotai 캘린더"
      stateLabel="Jotai + TanStack Query"
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
