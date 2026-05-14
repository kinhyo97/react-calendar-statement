import { useCalendarStore } from "./store";

export function App() {
  const { count, increase, reset } = useCalendarStore();

  return (
    <main style={{ display: "grid", minHeight: "100vh", placeItems: "center", fontFamily: "system-ui, sans-serif" }}>
      <section style={{ display: "grid", gap: 12, width: 320 }}>
        <h1>Zustand 기본 세팅</h1>
        <p>count: {count}</p>
        <button type="button" onClick={increase}>increase</button>
        <button type="button" onClick={reset}>reset</button>
      </section>
    </main>
  );
}
