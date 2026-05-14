import { useState } from "react";
import { useAuthSession, useCalendarCategories, useCalendarEvents } from "@calendar/api";
import type { CalendarEvent, CalendarFilter, EventFormValue } from "@calendar/types";
import { CalendarScreen, createEmptyForm, LoginScreen } from "@calendar/ui";
import { toDateKey } from "@calendar/utils";

export function App() {
  const auth = useAuthSession();
  const calendarEvents = useCalendarEvents(auth.token);
  const calendarCategories = useCalendarCategories(auth.token);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filter, setFilter] = useState<CalendarFilter>({ query: "", categoryId: "all" });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<EventFormValue>(() => createEmptyForm());

  if (!auth.user) {
    return <LoginScreen onLogin={auth.login} isLoading={auth.isLoggingIn || auth.isCheckingAuth} error={auth.loginError} />;
  }

  return (
    <CalendarScreen
      title="React 기본 상태 캘린더"
      stateLabel="useState + TanStack Query"
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
      onLogout={auth.logout}
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
