import { useAuthSession, useCalendarCategories, useCalendarEvents } from "@calendar/api";
import { CalendarScreen, LoginScreen } from "@calendar/ui";
import { fromDateKey } from "@calendar/utils";
import { useAppDispatch, useAppSelector } from "./hooks";
import { calendarActions } from "./store";

export function App() {
  const auth = useAuthSession();
  const calendarEvents = useCalendarEvents(auth.token);
  const calendarCategories = useCalendarCategories(auth.token);
  const dispatch = useAppDispatch();
  const calendar = useAppSelector((state) => state.calendar);

  if (!auth.user) {
    return <LoginScreen onLogin={auth.login} isLoading={auth.isLoggingIn || auth.isCheckingAuth} error={auth.loginError} />;
  }

  return (
    <CalendarScreen
      title="Redux Toolkit 캘린더"
      stateLabel="Redux Toolkit + TanStack Query"
      visibleMonth={fromDateKey(calendar.visibleMonth)}
      selectedDate={calendar.selectedDate}
      selectedEvent={calendar.selectedEvent}
      filter={calendar.filter}
      isFormOpen={calendar.isFormOpen}
      form={calendar.form}
      events={calendarEvents.events}
      categories={calendarCategories.categories}
      user={auth.user}
      isLoading={calendarEvents.isLoading || calendarCategories.isLoading}
      isError={calendarEvents.isError || calendarCategories.isError}
      isSaving={calendarEvents.isSaving || calendarCategories.isSaving}
      isDarkMode={calendar.isDarkMode}
      onLogout={auth.logout}
      onDarkModeToggle={() => dispatch(calendarActions.toggleDarkMode())}
      onVisibleMonthChange={(date) => dispatch(calendarActions.setVisibleMonth(date))}
      onSelectedDateChange={(date) => dispatch(calendarActions.setSelectedDate(date))}
      onSelectedEventChange={(event) => dispatch(calendarActions.setSelectedEvent(event))}
      onFilterChange={(filter) => dispatch(calendarActions.setFilter(filter))}
      onFormOpenChange={(open) => dispatch(calendarActions.setIsFormOpen(open))}
      onFormChange={(form) => dispatch(calendarActions.setForm(form))}
      onCategoryCreate={(category) => calendarCategories.createCategory(category)}
      onCategoryChange={(category) => calendarCategories.updateCategory(category)}
      onCreateEvent={(event) => calendarEvents.createEvent(event)}
      onUpdateEvent={(event) => calendarEvents.updateEvent(event)}
      onDeleteEvent={(id) => calendarEvents.deleteEvent(id)}
    />
  );
}
