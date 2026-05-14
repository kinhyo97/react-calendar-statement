import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type {
  AuthSession,
  AuthUser,
  CalendarCategory,
  CategoryInput,
  CalendarEvent,
  EventInput,
  LoginInput
} from "@calendar/types";

const API_BASE_URL = "http://localhost:4000";
const TOKEN_STORAGE_KEY = "react-calendar-statement-token";

export const authQueryKeys = {
  me: (token: string | null) => ["me", token] as const
};

export const calendarQueryKeys = {
  events: (token: string | null) => ["events", token] as const,
  categories: (token: string | null) => ["categories", token] as const
};

export const getStoredToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const setStoredToken = (token: string | null) => {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

const request = async <T>(path: string, options: RequestInit & { token?: string | null } = {}) => {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(error?.message ?? "요청에 실패했습니다.");
  }

  return (await response.json()) as T;
};

export const login = (input: LoginInput) =>
  request<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });

export const logout = (token: string) =>
  request<{ ok: true }>("/auth/logout", {
    method: "POST",
    token
  });

export const getMe = (token: string) => request<AuthUser>("/me", { token });

export const listEvents = (token: string) => request<CalendarEvent[]>("/events", { token });

export const listCategories = (token: string) => request<CalendarCategory[]>("/categories", { token });

export const updateCategory = (token: string, category: CalendarCategory) =>
  request<CalendarCategory>(`/categories/${category.id}`, {
    method: "PUT",
    token,
    body: JSON.stringify({
      name: category.name,
      color: category.color
    } satisfies CategoryInput)
  });

export const createEvent = (token: string, input: EventInput) =>
  request<CalendarEvent>("/events", {
    method: "POST",
    token,
    body: JSON.stringify(input)
  });

export const updateEvent = (token: string, event: CalendarEvent) =>
  request<CalendarEvent>(`/events/${event.id}`, {
    method: "PUT",
    token,
    body: JSON.stringify({
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      categoryId: event.categoryId,
      memo: event.memo ?? ""
    } satisfies EventInput)
  });

export const deleteEvent = (token: string, id: string) =>
  request<{ id: string }>(`/events/${id}`, {
    method: "DELETE",
    token
  });

export const useAuthSession = () => {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => getStoredToken());

  const meQuery = useQuery({
    queryKey: authQueryKeys.me(token),
    queryFn: () => getMe(token!),
    enabled: Boolean(token),
    retry: false
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      setStoredToken(session.token);
      setToken(session.token);
      queryClient.setQueryData(authQueryKeys.me(session.token), session.user);
      void queryClient.invalidateQueries({ queryKey: authQueryKeys.me(session.token) });
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (token) {
        await logout(token);
      }
    },
    onSettled: () => {
      setStoredToken(null);
      setToken(null);
      queryClient.clear();
    }
  });

  useEffect(() => {
    if (token && meQuery.isError) {
      setStoredToken(null);
      setToken(null);
    }
  }, [meQuery.isError, token]);

  return {
    token,
    user: meQuery.data ?? null,
    isCheckingAuth: Boolean(token) && meQuery.isLoading,
    isAuthenticated: Boolean(token && meQuery.data),
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error instanceof Error ? loginMutation.error.message : null
  };
};

export const useCalendarEvents = (token: string | null) => {
  const queryClient = useQueryClient();
  const queryKey = calendarQueryKeys.events(token);

  const eventsQuery = useQuery({
    queryKey,
    queryFn: () => listEvents(token!),
    enabled: Boolean(token)
  });

  const createMutation = useMutation({
    mutationFn: (input: EventInput) => createEvent(token!, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey })
  });

  const updateMutation = useMutation({
    mutationFn: (event: CalendarEvent) => updateEvent(token!, event),
    onSuccess: () => queryClient.invalidateQueries({ queryKey })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvent(token!, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previousEvents = queryClient.getQueryData<CalendarEvent[]>(queryKey) ?? [];

      queryClient.setQueryData<CalendarEvent[]>(
        queryKey,
        previousEvents.filter((event) => event.id !== id)
      );

      return { previousEvents };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(queryKey, context?.previousEvents ?? []);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey })
  });

  return {
    events: eventsQuery.data ?? [],
    isLoading: eventsQuery.isLoading,
    isError: eventsQuery.isError,
    createEvent: createMutation.mutate,
    updateEvent: updateMutation.mutate,
    deleteEvent: deleteMutation.mutate,
    isSaving: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  };
};

export const useCalendarCategories = (token: string | null) => {
  const queryClient = useQueryClient();
  const queryKey = calendarQueryKeys.categories(token);

  const categoriesQuery = useQuery({
    queryKey,
    queryFn: () => listCategories(token!),
    enabled: Boolean(token)
  });

  const updateMutation = useMutation({
    mutationFn: (category: CalendarCategory) => updateCategory(token!, category),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: calendarQueryKeys.events(token) });
    }
  });

  return {
    categories: categoriesQuery.data ?? [],
    isLoading: categoriesQuery.isLoading,
    isError: categoriesQuery.isError,
    updateCategory: updateMutation.mutate,
    isSaving: updateMutation.isPending
  };
};
