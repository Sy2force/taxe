import Database from 'better-sqlite3';
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'database.sqlite');

// Ensure data directory exists
export async function ensureDbDir(): Promise<void> {
  try {
    await fs.access(DB_DIR);
  } catch {
    await fs.mkdir(DB_DIR, { recursive: true });
  }
}

// SQLite for local development
let sqliteDb: Database.Database | null = null;

// PostgreSQL for production (Render)
let pgPool: Pool | null = null;

export async function getDatabase() {
  const isProduction = process.env.NODE_ENV === 'production';
  const databaseUrl = process.env.DATABASE_URL;
  
  if (isProduction && databaseUrl) {
    // Use PostgreSQL in production if DATABASE_URL is available
    if (!pgPool) {
      pgPool = new Pool({ connectionString: databaseUrl });
      await initPostgreSQL(pgPool);
    }
    return pgPool;
  } else {
    // Use SQLite in development or if DATABASE_URL is not available
    await ensureDbDir();
    if (!sqliteDb) {
      sqliteDb = new Database(DB_PATH);
      initSQLite(sqliteDb);
    }
    return sqliteDb;
  }
}

function initSQLite(db: Database.Database) {
  // Documents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      pages INTEGER,
      content TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      is_exercise INTEGER DEFAULT 0,
      is_laws INTEGER DEFAULT 0
    )
  `);

  // Generated answers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS generated_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      sources TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // Exercise document table
  db.exec(`
    CREATE TABLE IF NOT EXISTS exercise_document (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      pages INTEGER,
      content TEXT NOT NULL,
      uploaded_at TEXT NOT NULL
    )
  `);

  // Laws document table
  db.exec(`
    CREATE TABLE IF NOT EXISTS laws_document (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      pages INTEGER,
      content TEXT NOT NULL,
      uploaded_at TEXT NOT NULL
    )
  `);

  // Verification results table
  db.exec(`
    CREATE TABLE IF NOT EXISTS verification_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      verification_score REAL,
      is_correct INTEGER DEFAULT 0,
      missing_sources TEXT,
      incorrect_facts TEXT,
      created_at TEXT NOT NULL
    )
  `);
}

async function initPostgreSQL(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      pages INTEGER,
      content TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      is_exercise BOOLEAN DEFAULT FALSE,
      is_laws BOOLEAN DEFAULT FALSE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS generated_answers (
      id SERIAL PRIMARY KEY,
      question_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      sources JSONB,
      created_at TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercise_document (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      pages INTEGER,
      content TEXT NOT NULL,
      uploaded_at TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS laws_document (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      pages INTEGER,
      content TEXT NOT NULL,
      uploaded_at TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS verification_results (
      id SERIAL PRIMARY KEY,
      question_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      verification_score REAL,
      is_correct BOOLEAN DEFAULT FALSE,
      missing_sources JSONB,
      incorrect_facts JSONB,
      created_at TEXT NOT NULL
    )
  `);
}

// Document operations
export async function saveDocumentToDb(doc: any) {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO documents (id, name, type, pages, content, uploaded_at, is_exercise, is_laws) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET name=$2, type=$3, pages=$4, content=$5, uploaded_at=$6',
        [doc.id, doc.name, doc.type, doc.pages || null, doc.content, doc.uploadedAt, doc.isExercise || false, doc.isLaws || false]
      );
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare(`
      INSERT OR REPLACE INTO documents (id, name, type, pages, content, uploaded_at, is_exercise, is_laws)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(doc.id, doc.name, doc.type, doc.pages || null, doc.content, doc.uploadedAt, doc.isExercise ? 1 : 0, doc.isLaws ? 1 : 0);
  }
}

export async function getAllDocumentsFromDb() {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM documents');
      return result.rows.map(row => ({
        ...row,
        isExercise: row.is_exercise,
        isLaws: row.is_laws,
        uploadedAt: row.uploaded_at
      }));
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare('SELECT * FROM documents');
    const rows = stmt.all() as any[];
    return rows.map(row => ({
      ...row,
      isExercise: row.is_exercise === 1,
      isLaws: row.is_laws === 1,
      uploadedAt: row.uploaded_at
    }));
  }
}

export async function clearAllDocumentsFromDb() {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM documents');
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    sqlite.prepare('DELETE FROM documents').run();
  }
}

// Generated answers operations
export async function saveGeneratedAnswer(answer: any) {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO generated_answers (question_text, answer, sources, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (question_text) DO UPDATE SET answer=$2, sources=$3, created_at=$4',
        [answer.questionText, answer.answer, JSON.stringify(answer.sources), answer.createdAt || new Date().toISOString()]
      );
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare(`
      INSERT INTO generated_answers (question_id, question, answer, sources, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(answer.questionId, answer.question, answer.answer, JSON.stringify(answer.sources), answer.createdAt);
  }
}

export async function getAllGeneratedAnswersFromDb() {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM generated_answers');
      return result.rows.map(row => ({
        questionText: row.question_text,
        answer: row.answer,
        sources: typeof row.sources === 'string' ? JSON.parse(row.sources) : row.sources,
        createdAt: row.created_at
      }));
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare('SELECT * FROM generated_answers ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => ({
      questionText: row.question,
      answer: row.answer,
      questionId: row.question_id,
      sources: typeof row.sources === 'string' ? JSON.parse(row.sources) : row.sources,
      createdAt: row.created_at
    }));
  }
}

// Exercise document operations
export async function saveExerciseDocumentToDb(doc: any) {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO exercise_document (id, name, content, uploaded_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name=$2, content=$3, uploaded_at=$4',
        [doc.id, doc.name, doc.content, doc.uploadedAt]
      );
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare(`
      INSERT OR REPLACE INTO exercise_document (id, name, type, pages, content, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(doc.id, doc.name, doc.type, doc.pages || null, doc.content, doc.uploadedAt);
  }
}

export async function getExerciseDocumentFromDb() {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM exercise_document LIMIT 1');
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        content: row.content,
        uploadedAt: row.uploaded_at
      };
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare('SELECT * FROM exercise_document LIMIT 1');
    const row = stmt.get() as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      content: row.content,
      ...row,
      uploadedAt: row.uploaded_at
    };
  }
}

// Laws document operations
export async function saveLawsDocumentToDb(doc: any) {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO laws_document (id, name, content, uploaded_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name=$2, content=$3, uploaded_at=$4',
        [doc.id, doc.name, doc.content, doc.uploadedAt]
      );
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare(`
      INSERT OR REPLACE INTO laws_document (id, name, type, pages, content, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(doc.id, doc.name, doc.type, doc.pages || null, doc.content, doc.uploadedAt);
  }
}

export async function getLawsDocumentFromDb() {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM laws_document LIMIT 1');
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        content: row.content,
        uploadedAt: row.uploaded_at
      };
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare('SELECT * FROM laws_document LIMIT 1');
    const row = stmt.get() as any;
    if (!row) return null;
    return {
      ...row,
      uploadedAt: row.uploaded_at
    };
  }
}

export async function saveVerificationResult(result: any) {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO verification_results (question_id, question, answer, verification_score, is_correct, missing_sources, incorrect_facts, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [result.questionId, result.question, result.answer, result.score, result.isCorrect, JSON.stringify(result.missingSources), JSON.stringify(result.incorrectFacts), result.createdAt]
      );
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare(`
      INSERT INTO verification_results (question_id, question, answer, verification_score, is_correct, missing_sources, incorrect_facts, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(result.questionId, result.question, result.answer, result.score, result.isCorrect ? 1 : 0, JSON.stringify(result.missingSources), JSON.stringify(result.incorrectFacts), result.createdAt);
  }
}

export async function getAllVerificationResults() {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM verification_results ORDER BY created_at DESC');
      return result.rows.map(row => ({
        ...row,
        missingSources: row.missing_sources,
        incorrectFacts: row.incorrect_facts,
        isCorrect: row.is_correct
      }));
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare('SELECT * FROM verification_results ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => ({
      ...row,
      missingSources: JSON.parse(row.missing_sources || '[]'),
      incorrectFacts: JSON.parse(row.incorrect_facts || '[]'),
      isCorrect: row.is_correct === 1
    }));
  }
}

export async function clearVerificationResults() {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM verification_results');
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    sqlite.prepare('DELETE FROM verification_results').run();
  }
}
