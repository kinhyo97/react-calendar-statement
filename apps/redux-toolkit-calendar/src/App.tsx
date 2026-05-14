import { useAppDispatch, useAppSelector } from "./hooks";
import { calendarActions } from "./store";

export function App() {
  const dispatch = useAppDispatch();
  const calendar = useAppSelector((state) => state.calendar);

  return (
    <main style={{ display: "grid", minHeight: "100vh", placeItems: "center", fontFamily: "system-ui, sans-serif" }}>
      <section style={{ display: "grid", gap: 12, width: 320 }}>
        <h1>Redux Toolkit 기본 세팅</h1>
        <p>count: {calendar.count}</p>
        <button type="button" onClick={() => dispatch(calendarActions.increase())}>
          increase
        </button>
        <button type="button" onClick={() => dispatch(calendarActions.setCount(0))}>
          reset
        </button>
      </section>
    </main>
  );
}
