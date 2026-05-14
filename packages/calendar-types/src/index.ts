export type CalendarCategory = {
  id: string;
  userId: string;
  name: string;
  color: string;
};

export type CategoryInput = {
  name: string;
  color: string;
};

export type CalendarEvent = {
  id: string;
  userId: string;
  title: string;
  startDate: string;
  endDate: string;
  categoryId: string;
  memo?: string;
};

export type EventInput = Omit<CalendarEvent, "id" | "userId">;

export type CalendarFilter = {
  query: string;
  categoryId: string | "all";
};

export type EventFormValue = {
  title: string;
  startDate: string;
  endDate: string;
  categoryId: string;
  memo: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export type LoginInput = {
  email: string;
  password: string;
};
