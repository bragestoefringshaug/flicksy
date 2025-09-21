import * as SQLite from 'expo-sqlite';

type DatabaseConnection = SQLite.SQLiteDatabase;

let databaseInstance: DatabaseConnection | null = null;

export function getDatabase(): DatabaseConnection {
  if (databaseInstance) {
    return databaseInstance;
  }
  databaseInstance = SQLite.openDatabaseSync('flicksy.db');
  initializeSchema(databaseInstance);
  return databaseInstance;
}

function initializeSchema(db: DatabaseConnection): void {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username_hash TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_name TEXT NOT NULL,
      key_ciphertext TEXT NOT NULL,
      iv TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(service_name)
    );
  `);
}

export type UserRow = {
  id: number;
  username_hash: string;
  password_hash: string;
  password_salt: string;
  created_at: number;
};

export type ApiKeyRow = {
  id: number;
  service_name: string;
  key_ciphertext: string;
  iv: string;
  created_at: number;
};

export function runInTransaction(actions: (tx: SQLite.SQLTransactionAsync) => Promise<void>): Promise<void> {
  const db = getDatabase();
  return db.transactionAsync(async (tx) => {
    await actions(tx);
  });
}

export async function insertUser(usernameHash: string, passwordHash: string, passwordSalt: string): Promise<number> {
  const db = getDatabase();
  const createdAt = Date.now();
  const result = await db.runAsync(
    'INSERT INTO users (username_hash, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?)',
    [usernameHash, passwordHash, passwordSalt, createdAt]
  );
  return result.lastInsertRowId ?? 0;
}

export async function findUserByUsernameHash(usernameHash: string): Promise<UserRow | null> {
  const db = getDatabase();
  const rows = await db.getAllAsync<UserRow>('SELECT * FROM users WHERE username_hash = ?', [usernameHash]);
  return rows.length > 0 ? rows[0] : null;
}

export async function upsertApiKey(serviceName: string, keyCiphertext: string, iv: string): Promise<number> {
  const db = getDatabase();
  const createdAt = Date.now();
  const result = await db.runAsync(
    `INSERT INTO api_keys (service_name, key_ciphertext, iv, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(service_name) DO UPDATE SET key_ciphertext=excluded.key_ciphertext, iv=excluded.iv, created_at=excluded.created_at`,
    [serviceName, keyCiphertext, iv, createdAt]
  );
  return result.changes ?? 0;
}

export async function getApiKey(serviceName: string): Promise<ApiKeyRow | null> {
  const db = getDatabase();
  const rows = await db.getAllAsync<ApiKeyRow>('SELECT * FROM api_keys WHERE service_name = ?', [serviceName]);
  return rows.length > 0 ? rows[0] : null;
}


