import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import initSqlJs, { type Database as SqlDatabase, type SqlJsStatic, type SqlValue } from "sql.js";
import type {
  AuthSession,
  AuthUser,
  CalendarCategory,
  CategoryInput,
  CalendarEvent,
  EventInput,
  LoginInput
} from "@calendar/types";

type DbUser = AuthUser & {
  password: string;
};

type AuthContext = {
  db: SqlDatabase;
  token: string;
  user: DbUser;
};

const port = Number(process.env.PORT ?? 4000);
const serverDir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(serverDir, "..", "data");
const dbPath = join(dataDir, "calendar.db");
const require = createRequire(import.meta.url);
const wasmPath = require.resolve("sql.js/dist/sql-wasm.wasm");

let sqlPromise: Promise<SqlJsStatic> | null = null;

const getSql = () => {
  sqlPromise ??= initSqlJs({
    locateFile: () => wasmPath
  });

  return sqlPromise;
};

const json = (response: ServerResponse, status: number, data: unknown) => {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json"
  });
  response.end(JSON.stringify(data));
};

const readBody = async <T>(request: IncomingMessage): Promise<T> => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? (JSON.parse(raw) as T) : ({} as T);
};

const runMigrations = (db: SqlDatabase) => {
  db.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      category_id TEXT NOT NULL,
      memo TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_events_user_date ON events(user_id, start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_events_user_category ON events(user_id, category_id);
    CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  `);

  const eventColumns = allRows<{ name: string }>(db, "PRAGMA table_info(events)").map((row) => row.name);
  const categoryColumns = allRows<{ name: string; pk: number }>(db, "PRAGMA table_info(categories)");
  const categoryIdColumn = categoryColumns.find((row) => row.name === "id");
  const categoryUserColumn = categoryColumns.find((row) => row.name === "user_id");

  if (categoryIdColumn?.pk === 1 && categoryUserColumn?.pk === 0) {
    db.run(`
      ALTER TABLE categories RENAME TO categories_legacy;

      CREATE TABLE categories (
        id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      INSERT OR IGNORE INTO categories (id, user_id, name, color, created_at, updated_at)
      SELECT id, user_id, name, color, created_at, updated_at
      FROM categories_legacy;

      DROP TABLE categories_legacy;
    `);
  }

  if (!eventColumns.includes("start_date")) {
    db.run("ALTER TABLE events ADD COLUMN start_date TEXT");
  }

  if (!eventColumns.includes("end_date")) {
    db.run("ALTER TABLE events ADD COLUMN end_date TEXT");
  }

  if (eventColumns.includes("date")) {
    db.run("UPDATE events SET start_date = COALESCE(start_date, date), end_date = COALESCE(end_date, date)");
  }

  if (!eventColumns.includes("category_id")) {
    db.run("ALTER TABLE events ADD COLUMN category_id TEXT");
  }

  if (eventColumns.includes("category")) {
    db.run("UPDATE events SET category_id = COALESCE(category_id, category)");
  }

  db.run("UPDATE events SET category_id = 'etc' WHERE category_id IS NULL OR category_id = ''");
};

const openDb = async () => {
  const SQL = await getSql();

  await mkdir(dataDir, { recursive: true });

  try {
    await access(dbPath);
    const file = await readFile(dbPath);
    const db = new SQL.Database(file);
    runMigrations(db);
    return db;
  } catch {
    const db = new SQL.Database();
    runMigrations(db);
    await saveDb(db);
    return db;
  }
};

const saveDb = async (db: SqlDatabase) => {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dbPath, Buffer.from(db.export()));
};

const firstRow = <T extends Record<string, unknown>>(db: SqlDatabase, sql: string, params: SqlValue[] = []) => {
  const statement = db.prepare(sql);

  try {
    statement.bind(params);

    if (!statement.step()) {
      return null;
    }

    return statement.getAsObject() as T;
  } finally {
    statement.free();
  }
};

const allRows = <T extends Record<string, unknown>>(db: SqlDatabase, sql: string, params: SqlValue[] = []) => {
  const statement = db.prepare(sql);
  const rows: T[] = [];

  try {
    statement.bind(params);

    while (statement.step()) {
      rows.push(statement.getAsObject() as T);
    }

    return rows;
  } finally {
    statement.free();
  }
};

const hasColumn = (db: SqlDatabase, table: string, column: string) =>
  allRows<{ name: string }>(db, `PRAGMA table_info(${table})`).some((row) => row.name === column);

const toSession = (token: string, user: AuthUser): AuthSession => ({
  token,
  user
});

const publicUser = (user: DbUser): AuthUser => ({
  id: user.id,
  email: user.email,
  name: user.name
});

const categoryFromRow = (row: Record<string, unknown>): CalendarCategory => ({
  id: String(row.id),
  userId: String(row.user_id),
  name: String(row.name),
  color: String(row.color)
});

const eventFromRow = (row: Record<string, unknown>): CalendarEvent => ({
  id: String(row.id),
  userId: String(row.user_id),
  title: String(row.title),
  startDate: String(row.start_date),
  endDate: String(row.end_date),
  categoryId: String(row.category_id),
  memo: row.memo ? String(row.memo) : undefined
});

const getBearerToken = (request: IncomingMessage) => {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length);
};

const authenticate = async (request: IncomingMessage): Promise<AuthContext | null> => {
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  const db = await openDb();
  const user = firstRow<DbUser>(
    db,
    `
      SELECT users.id, users.email, users.password, users.name
      FROM sessions
      INNER JOIN users ON users.id = sessions.user_id
      WHERE sessions.token = ?
    `,
    [token]
  );

  return user ? { db, token, user } : null;
};

const isEventInput = (value: Partial<EventInput>): value is EventInput =>
  typeof value.title === "string" &&
  typeof value.startDate === "string" &&
  typeof value.endDate === "string" &&
  typeof value.categoryId === "string";

const isCategoryInput = (value: Partial<CategoryInput>): value is CategoryInput =>
  typeof value.name === "string" && typeof value.color === "string";

const normalizeEventInput = (input: EventInput): EventInput =>
  input.startDate <= input.endDate ? input : { ...input, startDate: input.endDate, endDate: input.startDate };

const defaultCategories = (userId: string): CalendarCategory[] => [
  { id: "work", userId, name: "업무", color: "#2f8fe9" },
  { id: "personal", userId, name: "개인", color: "#22aa89" },
  { id: "study", userId, name: "학습", color: "#f0ba20" },
  { id: "etc", userId, name: "기타", color: "#a779d8" }
];

const createDefaultEvents = (userId: string): CalendarEvent[] => [
  {
    id: randomUUID(),
    userId,
    title: "상태관리 비교",
    startDate: "2026-05-04",
    endDate: "2026-05-06",
    categoryId: "study",
    memo: "React, Zustand, Jotai, Recoil, Redux Toolkit"
  },
  {
    id: randomUUID(),
    userId,
    title: "API 서버 작업",
    startDate: "2026-05-11",
    endDate: "2026-05-14",
    categoryId: "work",
    memo: "SQLite와 인증 흐름"
  },
  {
    id: randomUUID(),
    userId,
    title: "캘린더 UI 정리",
    startDate: "2026-05-13",
    endDate: "2026-05-15",
    categoryId: "work",
    memo: "주 단위 lane 배치"
  },
  {
    id: randomUUID(),
    userId,
    title: "개인 일정",
    startDate: "2026-05-18",
    endDate: "2026-05-18",
    categoryId: "personal",
    memo: "하루 일정"
  },
  {
    id: randomUUID(),
    userId,
    title: "문서 정리",
    startDate: "2026-05-21",
    endDate: "2026-05-22",
    categoryId: "etc",
    memo: "API 명세 업데이트"
  }
];

const insertCategory = (db: SqlDatabase, category: CalendarCategory) => {
  db.run(
    `
      INSERT OR IGNORE INTO categories (id, user_id, name, color)
      VALUES (?, ?, ?, ?)
    `,
    [category.id, category.userId, category.name, category.color]
  );
};

const ensureDefaultCategories = (db: SqlDatabase, userId: string) => {
  defaultCategories(userId).forEach((category) => insertCategory(db, category));
};

const insertEvent = (db: SqlDatabase, event: CalendarEvent) => {
  if (hasColumn(db, "events", "date")) {
    db.run(
      `
        INSERT INTO events (id, user_id, title, date, start_date, end_date, category, category_id, memo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        event.id,
        event.userId,
        event.title,
        event.startDate,
        event.startDate,
        event.endDate,
        event.categoryId,
        event.categoryId,
        event.memo ?? null
      ]
    );
    return;
  }

  db.run(
    `
      INSERT INTO events (id, user_id, title, start_date, end_date, category_id, memo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [event.id, event.userId, event.title, event.startDate, event.endDate, event.categoryId, event.memo ?? null]
  );
};

const closeAuth = async (auth: AuthContext | null, shouldSave = false) => {
  if (!auth) {
    return;
  }

  if (shouldSave) {
    await saveDb(auth.db);
  }

  auth.db.close();
};

const server = createServer(async (request, response) => {
  let auth: AuthContext | null = null;

  try {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

    if (request.method === "POST" && url.pathname === "/auth/login") {
      const input = await readBody<LoginInput>(request);
      const email = input.email?.trim().toLowerCase();
      const password = input.password?.trim();

      if (!email || !password) {
        json(response, 400, { message: "이메일과 비밀번호를 입력하세요." });
        return;
      }

      const db = await openDb();
      let shouldSave = false;

      try {
        let user = firstRow<DbUser>(
          db,
          "SELECT id, email, password, name FROM users WHERE email = ?",
          [email]
        );

        if (user && user.password !== password) {
          json(response, 401, { message: "비밀번호가 일치하지 않습니다." });
          return;
        }

        if (!user) {
          user = {
            id: randomUUID(),
            email,
            password,
            name: email.split("@")[0] || "calendar-user"
          };
          db.run("INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)", [
            user.id,
            user.email,
            user.password,
            user.name
          ]);
          ensureDefaultCategories(db, user.id);
          createDefaultEvents(user.id).forEach((event) => insertEvent(db, event));
          shouldSave = true;
        } else {
          ensureDefaultCategories(db, user.id);
          shouldSave = true;
        }

        const token = randomUUID();
        db.run("INSERT INTO sessions (token, user_id) VALUES (?, ?)", [token, user.id]);
        shouldSave = true;
        await saveDb(db);
        shouldSave = false;
        json(response, 200, toSession(token, publicUser(user)));
        return;
      } finally {
        if (shouldSave) {
          await saveDb(db);
        }
        db.close();
      }
    }

    if (request.method === "POST" && url.pathname === "/auth/logout") {
      auth = await authenticate(request);
      if (!auth) {
        json(response, 401, { message: "인증이 필요합니다." });
        return;
      }

      auth.db.run("DELETE FROM sessions WHERE token = ?", [auth.token]);
      await closeAuth(auth, true);
      auth = null;
      json(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && url.pathname === "/me") {
      auth = await authenticate(request);
      if (!auth) {
        json(response, 401, { message: "인증이 필요합니다." });
        return;
      }

      json(response, 200, publicUser(auth.user));
      return;
    }

    if (url.pathname === "/categories") {
      auth = await authenticate(request);
      if (!auth) {
        json(response, 401, { message: "인증이 필요합니다." });
        return;
      }

      if (request.method === "GET") {
        ensureDefaultCategories(auth.db, auth.user.id);
        await saveDb(auth.db);
        const rows = allRows(
          auth.db,
          `
            SELECT id, user_id, name, color
            FROM categories
            WHERE user_id = ?
            ORDER BY created_at ASC
          `,
          [auth.user.id]
        );
        json(response, 200, rows.map(categoryFromRow));
        return;
      }
    }

    const categoryMatch = url.pathname.match(/^\/categories\/([^/]+)$/);
    if (categoryMatch) {
      auth = await authenticate(request);
      if (!auth) {
        json(response, 401, { message: "인증이 필요합니다." });
        return;
      }

      const categoryId = categoryMatch[1];
      const category = firstRow(
        auth.db,
        "SELECT id, user_id, name, color FROM categories WHERE id = ? AND user_id = ?",
        [categoryId, auth.user.id]
      );

      if (!category) {
        json(response, 404, { message: "카테고리를 찾을 수 없습니다." });
        return;
      }

      if (request.method === "PUT") {
        const input = await readBody<CategoryInput>(request);
        if (!isCategoryInput(input)) {
          json(response, 400, { message: "카테고리 입력값을 확인하세요." });
          return;
        }

        const color = input.color.trim();
        const name = input.name.trim();

        if (!name || !/^#[0-9a-fA-F]{6}$/.test(color)) {
          json(response, 400, { message: "카테고리 이름과 색상을 확인하세요." });
          return;
        }

        auth.db.run(
          `
            UPDATE categories
            SET name = ?, color = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
          `,
          [name, color, categoryId, auth.user.id]
        );
        await closeAuth(auth, true);
        auth = null;
        json(response, 200, { id: categoryId, userId: category.user_id, name, color });
        return;
      }
    }

    if (url.pathname === "/events") {
      auth = await authenticate(request);
      if (!auth) {
        json(response, 401, { message: "인증이 필요합니다." });
        return;
      }

      if (request.method === "GET") {
        const rows = allRows(
          auth.db,
          `
            SELECT id, user_id, title, start_date, end_date, category_id, memo
            FROM events
            WHERE user_id = ?
            ORDER BY start_date ASC, end_date ASC, created_at ASC
          `,
          [auth.user.id]
        );
        json(response, 200, rows.map(eventFromRow));
        return;
      }

      if (request.method === "POST") {
        const input = await readBody<EventInput>(request);
        if (!isEventInput(input)) {
          json(response, 400, { message: "일정 입력값을 확인하세요." });
          return;
        }

        const normalizedInput = normalizeEventInput(input);
        const category = firstRow(
          auth.db,
          "SELECT id FROM categories WHERE id = ? AND user_id = ?",
          [normalizedInput.categoryId, auth.user.id]
        );

        if (!category) {
          json(response, 400, { message: "카테고리를 확인하세요." });
          return;
        }

        const event: CalendarEvent = {
          id: randomUUID(),
          userId: auth.user.id,
          title: normalizedInput.title.trim(),
          startDate: normalizedInput.startDate,
          endDate: normalizedInput.endDate,
          categoryId: normalizedInput.categoryId,
          memo: normalizedInput.memo?.trim()
        };

        insertEvent(auth.db, event);
        await closeAuth(auth, true);
        auth = null;
        json(response, 201, event);
        return;
      }
    }

    const eventMatch = url.pathname.match(/^\/events\/([^/]+)$/);
    if (eventMatch) {
      auth = await authenticate(request);
      if (!auth) {
        json(response, 401, { message: "인증이 필요합니다." });
        return;
      }

      const eventId = eventMatch[1];
      const eventRow = firstRow(
        auth.db,
        "SELECT id, user_id, title, start_date, end_date, category_id, memo FROM events WHERE id = ? AND user_id = ?",
        [eventId, auth.user.id]
      );

      if (!eventRow) {
        json(response, 404, { message: "일정을 찾을 수 없습니다." });
        return;
      }

      if (request.method === "PUT") {
        const input = await readBody<EventInput>(request);
        if (!isEventInput(input)) {
          json(response, 400, { message: "일정 입력값을 확인하세요." });
          return;
        }

        const normalizedInput = normalizeEventInput(input);
        const category = firstRow(
          auth.db,
          "SELECT id FROM categories WHERE id = ? AND user_id = ?",
          [normalizedInput.categoryId, auth.user.id]
        );

        if (!category) {
          json(response, 400, { message: "카테고리를 확인하세요." });
          return;
        }

        const event: CalendarEvent = {
          id: String(eventRow.id),
          userId: String(eventRow.user_id),
          title: normalizedInput.title.trim(),
          startDate: normalizedInput.startDate,
          endDate: normalizedInput.endDate,
          categoryId: normalizedInput.categoryId,
          memo: normalizedInput.memo?.trim()
        };

        if (hasColumn(auth.db, "events", "date")) {
          auth.db.run(
            `
              UPDATE events
              SET title = ?, date = ?, start_date = ?, end_date = ?, category = ?, category_id = ?, memo = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND user_id = ?
            `,
            [
              event.title,
              event.startDate,
              event.startDate,
              event.endDate,
              event.categoryId,
              event.categoryId,
              event.memo ?? null,
              event.id,
              auth.user.id
            ]
          );
        } else {
          auth.db.run(
            `
              UPDATE events
              SET title = ?, start_date = ?, end_date = ?, category_id = ?, memo = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND user_id = ?
            `,
            [event.title, event.startDate, event.endDate, event.categoryId, event.memo ?? null, event.id, auth.user.id]
          );
        }
        await closeAuth(auth, true);
        auth = null;
        json(response, 200, event);
        return;
      }

      if (request.method === "DELETE") {
        auth.db.run("DELETE FROM events WHERE id = ? AND user_id = ?", [eventId, auth.user.id]);
        await closeAuth(auth, true);
        auth = null;
        json(response, 200, { id: eventId });
        return;
      }
    }

    json(response, 404, { message: "Not found" });
  } catch (error) {
    json(response, 500, { message: error instanceof Error ? error.message : "Server error" });
  } finally {
    await closeAuth(auth);
  }
});

server.listen(port, () => {
  console.log(`Calendar API server listening on http://localhost:${port}`);
  console.log(`SQLite database: ${dbPath}`);
});
