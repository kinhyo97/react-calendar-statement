import { useAtom } from "jotai";
import { countAtom } from "./atoms";

export function App() {
  const [count, setCount] = useAtom(countAtom);

  return (
    <main style={{ display: "grid", minHeight: "100vh", placeItems: "center", fontFamily: "system-ui, sans-serif" }}>
      <section style={{ display: "grid", gap: 12, width: 320 }}>
        <h1>Jotai 기본 세팅</h1>
        <p>count: {count}</p>
        <button type="button" onClick={() => setCount((value) => value + 1)}>increase</button>
        <button type="button" onClick={() => setCount(0)}>reset</button>
      </section>
    </main>
  );
}
