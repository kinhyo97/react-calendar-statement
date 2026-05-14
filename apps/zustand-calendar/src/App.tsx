import { useAuthSession, useCalendarCategories, useCalendarEvents } from "@calendar/api";
import { CalendarScreen, LoginScreen } from "@calendar/ui";
import { useCalendarStore } from "./store";

export function App() {
  const auth = useAuthSession();
  const calendarEvents = useCalendarEvents(auth.token);
  const calendarCategories = useCalendarCategories(auth.token);
  const store = useCalendarStore();

  if (!auth.user) {
    return <LoginScreen onLogin={auth.login} isLoading={auth.isLoggingIn || auth.isCheckingAuth} error={auth.loginError} />;
  }

  return (
    <CalendarScreen
      title="Zustand 캘린더"
      stateLabel="Zustand + TanStack Query"
      visibleMonth={store.visibleMonth}
      selectedDate={store.selectedDate}
      selectedEvent={store.selectedEvent}
      filter={store.filter}
      isFormOpen={store.isFormOpen}
      form={store.form}
      events={calendarEvents.events}
      categories={calendarCategories.categories}
      user={auth.user}
      isLoading={calendarEvents.isLoading || calendarCategories.isLoading}
      isError={calendarEvents.isError || calendarCategories.isError}
      isSaving={calendarEvents.isSaving || calendarCategories.isSaving}
      isDarkMode={store.isDarkMode}
      onLogout={auth.logout}
      onDarkModeToggle={store.toggleDarkMode}
      onVisibleMonthChange={store.setVisibleMonth}
      onSelectedDateChange={store.setSelectedDate}
      onSelectedEventChange={store.setSelectedEvent}
      onFilterChange={store.setFilter}
      onFormOpenChange={store.setIsFormOpen}
      onFormChange={store.setForm}
      onCategoryCreate={(category) => calendarCategories.createCategory(category)}
      onCategoryChange={(category) => calendarCategories.updateCategory(category)}
      onCreateEvent={(event) => calendarEvents.createEvent(event)}
      onUpdateEvent={(event) => calendarEvents.updateEvent(event)}
      onDeleteEvent={(id) => calendarEvents.deleteEvent(id)}
    />
  );
}
