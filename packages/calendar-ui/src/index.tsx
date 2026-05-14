import { Bell, CalendarDays, ChevronLeft, ChevronRight, Loader2, LogOut, Plus, Search, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { AuthUser, CalendarCategory, CalendarEvent, CalendarFilter, EventFormValue, LoginInput, CategoryInput } from "@calendar/types";
import {
  addMonths,
  createMonthWeeks,
  eventOccursOnDate,
  filterEvents,
  fromDateKey,
  layoutWeekEvents,
  monthTitle,
  toDateKey
} from "@calendar/utils";

export type CalendarScreenProps = {
  title: string;
  stateLabel: string;
  visibleMonth: Date;
  selectedDate: string;
  selectedEvent: CalendarEvent | null;
  filter: CalendarFilter;
  isFormOpen: boolean;
  form: EventFormValue;
  events: CalendarEvent[];
  categories: CalendarCategory[];
  user: AuthUser;
  isLoading: boolean;
  isError: boolean;
  isSaving: boolean;
  onLogout: () => void;
  onVisibleMonthChange: (date: Date) => void;
  onSelectedDateChange: (date: string) => void;
  onSelectedEventChange: (event: CalendarEvent | null) => void;
  onFilterChange: (filter: CalendarFilter) => void;
  onFormOpenChange: (open: boolean) => void;
  onFormChange: (form: EventFormValue) => void;
  onCategoryCreate: (category: CategoryInput) => void;
  onCategoryChange: (category: CalendarCategory) => void;
  onCreateEvent: (event: EventFormValue) => void;
  onUpdateEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
};

export type LoginScreenProps = {
  onLogin: (input: LoginInput) => void;
  isLoading: boolean;
  error: string | null;
};

export const createEmptyForm = (date = toDateKey(new Date())): EventFormValue => ({
  title: "",
  startDate: date,
  endDate: date,
  categoryId: "work",
  memo: ""
});

export const formFromEvent = (event: CalendarEvent): EventFormValue => ({
  title: event.title,
  startDate: event.startDate,
  endDate: event.endDate,
  categoryId: event.categoryId,
  memo: event.memo ?? ""
});

export function LoginScreen({ onLogin, isLoading, error }: LoginScreenProps) {
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password");

  const handleSubmit = () => {
    onLogin({ email, password });
  };

  return (
    <main className="loginShell">
      <section className="loginPanel">
        <div>
          <p className="loginEyebrow">Calendar Statement</p>
          <h1>로그인</h1>
          <p>이메일 기준으로 계정이 만들어지고, 일정은 유저별로 저장됩니다.</p>
        </div>

        <label>
          이메일
          <input value={email} type="email" onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          비밀번호
          <input value={password} type="password" onChange={(event) => setPassword(event.target.value)} />
        </label>

        {error ? <p className="loginError">{error}</p> : null}

        <button className="primaryButton loginButton" type="button" disabled={isLoading} onClick={handleSubmit}>
          {isLoading ? "로그인 중" : "로그인"}
        </button>
      </section>
    </main>
  );
}

export function CalendarScreen({
  title,
  stateLabel,
  visibleMonth,
  selectedDate,
  selectedEvent,
  filter,
  isFormOpen,
  form,
  events,
  categories,
  user,
  isLoading,
  isError,
  isSaving,
  onLogout,
  onVisibleMonthChange,
  onSelectedDateChange,
  onSelectedEventChange,
  onFilterChange,
  onFormOpenChange,
  onFormChange,
  onCategoryCreate,
  onCategoryChange,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent
}: CalendarScreenProps) {
  const [newCategory, setNewCategory] = useState<CategoryInput>({ name: "", color: "#2176e8" });
  const categoryOptions = [{ id: "all", name: "전체", color: "#6f798a", userId: user.id }, ...categories];
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const filteredEvents = filterEvents(events, filter);
  const selectedDateEvents = filteredEvents.filter((event) => eventOccursOnDate(event, selectedDate));
  const weeks = createMonthWeeks(visibleMonth);
  const visibleMonthLabel = `${visibleMonth.getFullYear()}.${String(visibleMonth.getMonth() + 1).padStart(2, "0")}`;

  const openCreateForm = (date = selectedDate) => {
    onSelectedEventChange(null);
    onFormChange({ ...createEmptyForm(date), categoryId: categories[0]?.id ?? "work" });
    onFormOpenChange(true);
  };

  const categoryFor = (categoryId: string) =>
    categoryMap.get(categoryId) ?? { id: categoryId, userId: user.id, name: categoryId, color: "#6f798a" };

  const openEditForm = (event: CalendarEvent) => {
    onSelectedEventChange(event);
    onFormChange(formFromEvent(event));
    onFormOpenChange(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      return;
    }

    if (selectedEvent) {
      onUpdateEvent({ ...selectedEvent, ...form, title: form.title.trim() });
    } else {
      onCreateEvent({ ...form, title: form.title.trim() });
    }

    onFormOpenChange(false);
  };

  const handleCreateCategory = () => {
    const name = newCategory.name.trim();
    if (!name) {
      return;
    }

    onCategoryCreate({ name, color: newCategory.color });
    setNewCategory({ name: "", color: "#2176e8" });
  };

  return (
    <main className="appShell">
      <section className="calendarFrame" aria-label={title}>
        <header className="appBar">
          <button type="button" className="brandButton" aria-label={title}>
            <CalendarDays size={20} />
          </button>
          <div className="monthHeading">
            <strong>{title}</strong>
            <span>
              {visibleMonthLabel} · {stateLabel} · {user.name}
            </span>
          </div>
          <div className="appActions">
            <button type="button" className="iconButton alertButton" aria-label="알림">
              <Bell size={18} />
            </button>
            <button type="button" className="iconButton" aria-label="로그아웃" onClick={onLogout}>
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <div className="contentLayout">
          <section className="monthPanel">
            <div className="calendarToolbar">
              <div className="monthSwitcher">
                <button type="button" className="iconButton" aria-label="이전 달" onClick={() => onVisibleMonthChange(addMonths(visibleMonth, -1))}>
                  <ChevronLeft size={18} />
                </button>
                <strong>{monthTitle(visibleMonth)}</strong>
                <button type="button" className="iconButton" aria-label="다음 달" onClick={() => onVisibleMonthChange(addMonths(visibleMonth, 1))}>
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="toolbarActions">
                <button type="button" className="todayButton" onClick={() => onVisibleMonthChange(new Date())}>
                  오늘
                </button>
                <button type="button" className="primaryButton addEventButton" onClick={() => openCreateForm(selectedDate)}>
                  <Plus size={17} />
                  일정 추가
                </button>
              </div>
            </div>

            <div className="compactFilters">
              <label className="searchBox">
                <Search size={15} />
                <input
                  value={filter.query}
                  placeholder="일정 검색"
                  onChange={(event) => onFilterChange({ ...filter, query: event.target.value })}
                />
              </label>
              <select
                value={filter.categoryId}
                onChange={(event) => onFilterChange({ ...filter, categoryId: event.target.value as CalendarFilter["categoryId"] })}
              >
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {isLoading ? (
              <div className="status">
                <Loader2 className="spin" size={20} />
                불러오는 중
              </div>
            ) : isError ? (
              <div className="status error">일정을 불러오지 못했습니다.</div>
            ) : (
              <div className="calendarBoard">
                {["일", "월", "화", "수", "목", "금", "토"].map((weekday) => (
                  <div className="weekday" key={weekday}>
                    {weekday}
                  </div>
                ))}
                {weeks.map((week) => {
                  const { bars, hiddenCount } = layoutWeekEvents(week, filteredEvents);

                  return (
                    <div className="weekRow" key={week[0].date}>
                      <div className="weekDays">
                        {week.map((day) => (
                          <button
                            type="button"
                            key={day.date}
                            className={[
                              "dayCell",
                              day.isCurrentMonth ? "" : "mutedDay",
                              day.date === selectedDate ? "selectedDay" : "",
                              day.isToday ? "today" : ""
                            ].join(" ")}
                            onClick={() => {
                              onSelectedDateChange(day.date);
                              onFormChange({ ...form, startDate: day.date, endDate: day.date });
                            }}
                            onDoubleClick={() => openCreateForm(day.date)}
                          >
                            <span className="dayNumber">{day.dayNumber}</span>
                          </button>
                        ))}
                      </div>
                      <div className="weekEvents">
                        {bars.map((bar) => (
                          <button
                            type="button"
                            key={`${bar.event.id}-${bar.startIndex}-${bar.lane}`}
                            className={[
                              "eventBar",
                              bar.isClippedStart ? "clippedStart" : "",
                              bar.isClippedEnd ? "clippedEnd" : ""
                            ].join(" ")}
                            style={{
                              background: categoryFor(bar.event.categoryId).color,
                              gridColumn: `${bar.startIndex + 1} / span ${bar.span}`,
                              gridRow: bar.lane + 1
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditForm(bar.event);
                            }}
                          >
                            {bar.event.title}
                          </button>
                        ))}
                        {hiddenCount > 0 ? <span className="moreEvents">+{hiddenCount}</span> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="agendaPanel">
          <div className="agendaHeader">
            <div>
              <span>{new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(fromDateKey(selectedDate))}</span>
              <strong>{monthTitle(visibleMonth)}</strong>
            </div>
            <button type="button" className="addButton" aria-label="일정 추가" onClick={() => openCreateForm(selectedDate)}>
              <Plus size={18} />
            </button>
          </div>

          <div className="eventList">
            {selectedDateEvents.length === 0 ? (
              <p className="emptyText">등록된 일정이 없습니다.</p>
            ) : (
              selectedDateEvents.map((event) => (
                <article className="eventCard" key={event.id}>
                  <button type="button" className="eventContent" onClick={() => openEditForm(event)}>
                    <span className="categoryLine" style={{ background: categoryFor(event.categoryId).color }} />
                    <span>
                      <strong>{event.title}</strong>
                      {event.memo ? <small>{event.memo}</small> : null}
                    </span>
                  </button>
                  <button type="button" className="iconButton" aria-label="삭제" onClick={() => onDeleteEvent(event.id)}>
                    <Trash2 size={16} />
                  </button>
                </article>
              ))
            )}
          </div>
          <div className="categoryEditor">
            <h3>카테고리</h3>
            <div className="categoryCreateRow">
              <input
                aria-label="새 카테고리 색상"
                className="colorInput"
                type="color"
                value={newCategory.color}
                onChange={(event) => setNewCategory({ ...newCategory, color: event.target.value })}
              />
              <input
                aria-label="새 카테고리 이름"
                placeholder="새 카테고리"
                value={newCategory.name}
                onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleCreateCategory();
                  }
                }}
              />
              <button className="categoryAddButton" type="button" disabled={isSaving || !newCategory.name.trim()} onClick={handleCreateCategory}>
                <Plus size={16} />
              </button>
            </div>
            {categories.map((category) => (
              <div className="categoryEditorRow" key={category.id}>
                <input
                  aria-label={`${category.name} 색상`}
                  className="colorInput"
                  type="color"
                  value={category.color}
                  onChange={(event) => onCategoryChange({ ...category, color: event.target.value })}
                />
                <input
                  aria-label={`${category.name} 이름`}
                  value={category.name}
                  onChange={(event) => onCategoryChange({ ...category, name: event.target.value })}
                />
              </div>
            ))}
          </div>
          </aside>
        </div>
      </section>

      {isFormOpen ? (
        <div className="modalBackdrop" role="presentation">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="event-form-title">
            <div className="modalHeader">
              <h2 id="event-form-title">{selectedEvent ? "일정 수정" : "일정 추가"}</h2>
              <button type="button" aria-label="닫기" onClick={() => onFormOpenChange(false)}>
                <X size={18} />
              </button>
            </div>

            <label>
              제목
              <input value={form.title} onChange={(event) => onFormChange({ ...form, title: event.target.value })} />
            </label>
            <label>
              시작일
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => onFormChange({ ...form, startDate: event.target.value })}
              />
            </label>
            <label>
              종료일
              <input
                type="date"
                value={form.endDate}
                onChange={(event) => onFormChange({ ...form, endDate: event.target.value })}
              />
            </label>
            <label>
              카테고리
              <select
                value={form.categoryId}
                onChange={(event) => onFormChange({ ...form, categoryId: event.target.value })}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              메모
              <textarea value={form.memo} onChange={(event) => onFormChange({ ...form, memo: event.target.value })} />
            </label>

            <div className="modalActions">
              <button type="button" onClick={() => onFormOpenChange(false)}>
                취소
              </button>
              <button className="primaryButton" type="button" disabled={isSaving} onClick={handleSubmit}>
                {isSaving ? "저장 중" : "저장"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
