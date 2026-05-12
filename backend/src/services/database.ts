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
  
  console.log(`[getDatabase] isProduction: ${isProduction}, databaseUrl: ${databaseUrl ? 'SET' : 'NOT_SET'}`);
  
  if (isProduction && databaseUrl) {
    // Use PostgreSQL in production if DATABASE_URL is available
    if (!pgPool) {
      console.log('[getDatabase] Initializing PostgreSQL Pool...');
      pgPool = new Pool({ 
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
      });
      await initPostgreSQL(pgPool);
      console.log('✅ PostgreSQL Pool initialized');
    }
    return pgPool;
  } else {
    // Use SQLite in development or if DATABASE_URL is not available
    await ensureDbDir();
    if (!sqliteDb) {
      console.log('[getDatabase] Initializing SQLite database...');
      sqliteDb = new Database(DB_PATH);
      initSQLite(sqliteDb);
      console.log('✅ SQLite database initialized');
    }
    return sqliteDb;
  }
}

function initSQLite(db: Database.Database) {
  // Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      status TEXT DEFAULT 'active'
    )
  `);

  // Documents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      filename TEXT NOT NULL,
      mimetype TEXT,
      extracted_text TEXT,
      character_count INTEGER,
      page_count INTEGER,
      chunks_count INTEGER,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `);

  // Questions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      number INTEGER NOT NULL,
      original_text TEXT NOT NULL,
      original_hebrew TEXT,
      cleaned_hebrew TEXT,
      french_translation TEXT,
      french_understanding TEXT,
      answer_limit_lines INTEGER DEFAULT 15,
      points TEXT,
      page_start INTEGER,
      page_end INTEGER,
      language TEXT DEFAULT 'hebrew',
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `);

  // Answers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      suggested_answer TEXT,
      user_answer TEXT,
      reasoning_fr TEXT,
      confidence INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      sources_json TEXT,
      keywords_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `);

  // Final checks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS final_checks (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      score REAL,
      status TEXT,
      issues_json TEXT,
      corrections_json TEXT,
      sources_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `);

  // Document chunks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      page_number INTEGER,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (document_id) REFERENCES documents(id)
    )
  `);

  // Final reports table
  db.exec(`
    CREATE TABLE IF NOT EXISTS final_reports (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      summary_json TEXT,
      final_text TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `);

  // Migration: Add cleaned_hebrew column if it doesn't exist
  try {
    const columns = db.prepare("PRAGMA table_info(questions)").all() as any[];
    const hasCleanedHebrew = columns.some((col: any) => col.name === 'cleaned_hebrew');
    
    if (!hasCleanedHebrew) {
      db.exec('ALTER TABLE questions ADD COLUMN cleaned_hebrew TEXT');
      console.log('✅ Migration: cleaned_hebrew column added to questions table (SQLite)');
    }
  } catch (error) {
    console.log('ℹ️  cleaned_hebrew column already exists (SQLite)');
  }

  // Migration: Add french_understanding column if it doesn't exist
  try {
    const columns = db.prepare("PRAGMA table_info(questions)").all() as any[];
    const hasFrenchUnderstanding = columns.some((col: any) => col.name === 'french_understanding');
    
    if (!hasFrenchUnderstanding) {
      db.exec('ALTER TABLE questions ADD COLUMN french_understanding TEXT');
      console.log('✅ Migration: french_understanding column added to questions table (SQLite)');
    }
  } catch (error) {
    console.log('ℹ️  french_understanding column already exists (SQLite)');
  }

  // Migration: Add french_translation column if it doesn't exist
  try {
    const columns = db.prepare("PRAGMA table_info(questions)").all() as any[];
    const hasFrenchTranslation = columns.some((col: any) => col.name === 'french_translation');
    
    if (!hasFrenchTranslation) {
      db.exec('ALTER TABLE questions ADD COLUMN french_translation TEXT');
      console.log('✅ Migration: french_translation column added to questions table (SQLite)');
    }
  } catch (error) {
    console.log('ℹ️  french_translation column already exists (SQLite)');
  }

  // Migration: Add order_index column if it doesn't exist
  try {
    const columns = db.prepare("PRAGMA table_info(questions)").all() as any[];
    const hasOrderIndex = columns.some((col: any) => col.name === 'order_index');
    
    if (!hasOrderIndex) {
      db.exec('ALTER TABLE questions ADD COLUMN order_index INTEGER DEFAULT 0');
      console.log('✅ Migration: order_index column added to questions table (SQLite)');
    }
  } catch (error) {
    console.log('ℹ️  order_index column already exists (SQLite)');
  }

  // Migration: Add source column if it doesn't exist
  try {
    const columns = db.prepare("PRAGMA table_info(questions)").all() as any[];
    const hasSource = columns.some((col: any) => col.name === 'source');
    
    if (!hasSource) {
      db.exec('ALTER TABLE questions ADD COLUMN source TEXT DEFAULT "auto"');
      console.log('✅ Migration: source column added to questions table (SQLite)');
    }
  } catch (error) {
    console.log('ℹ️  source column already exists (SQLite)');
  }
}

async function initPostgreSQL(pool: Pool) {
  // Drop legacy tables that conflict with new schema
  // (old schema without session_id was blocking the new one due to IF NOT EXISTS)
  try {
    const result = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'documents' AND column_name = 'session_id'
    `);
    if (result.rows.length === 0) {
      console.log('⚠️  Legacy documents table detected (missing session_id), dropping...');
      await pool.query('DROP TABLE IF EXISTS documents CASCADE');
      console.log('✅ Legacy documents table dropped, will be recreated with correct schema');
    }
  } catch (err) {
    console.log('ℹ️  documents table check failed:', err);
  }

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      status TEXT DEFAULT 'active'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      filename TEXT NOT NULL,
      mimetype TEXT,
      extracted_text TEXT,
      character_count INTEGER,
      page_count INTEGER,
      chunks_count INTEGER,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      number INTEGER NOT NULL,
      original_text TEXT NOT NULL,
      original_hebrew TEXT,
      cleaned_hebrew TEXT,
      french_translation TEXT,
      french_understanding TEXT,
      answer_limit_lines INTEGER DEFAULT 15,
      points TEXT,
      page_start INTEGER,
      page_end INTEGER,
      language TEXT DEFAULT 'hebrew',
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `);

  // Migration: Add cleaned_hebrew column if it doesn't exist
  try {
    await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'questions' AND column_name = 'cleaned_hebrew'
          ) THEN
              ALTER TABLE questions ADD COLUMN cleaned_hebrew TEXT;
          END IF;
      END $$
    `);
    console.log('✅ Migration: cleaned_hebrew column added to questions table');
  } catch (error) {
    console.log('ℹ️  cleaned_hebrew column already exists or migration not needed');
  }

  // Migration: Add french_understanding column if it doesn't exist
  try {
    await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'questions' AND column_name = 'french_understanding'
          ) THEN
              ALTER TABLE questions ADD COLUMN french_understanding TEXT;
          END IF;
      END $$
    `);
    console.log('✅ Migration: french_understanding column added to questions table');
  } catch (error) {
    console.log('ℹ️  french_understanding column already exists or migration not needed');
  }

  // Migration: Add order_index column if it doesn't exist
  try {
    await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'questions' AND column_name = 'order_index'
          ) THEN
              ALTER TABLE questions ADD COLUMN order_index INTEGER DEFAULT 0;
          END IF;
      END $$
    `);
    console.log('✅ Migration: order_index column added to questions table');
  } catch (error) {
    console.log('ℹ️  order_index column already exists or migration not needed');
  }

  // Migration: Add source column if it doesn't exist
  try {
    await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'questions' AND column_name = 'source'
          ) THEN
              ALTER TABLE questions ADD COLUMN source TEXT DEFAULT 'auto';
          END IF;
      END $$
    `);
    console.log('✅ Migration: source column added to questions table');
  } catch (error) {
    console.log('ℹ️  source column already exists or migration not needed');
  }

  // Migration: Add french_translation column if it doesn't exist
  try {
    await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'questions' AND column_name = 'french_translation'
          ) THEN
              ALTER TABLE questions ADD COLUMN french_translation TEXT;
          END IF;
      END $$
    `);
    console.log('✅ Migration: french_translation column added to questions table');
  } catch (error) {
    console.log('ℹ️  french_translation column already exists or migration not needed');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      suggested_answer TEXT,
      user_answer TEXT,
      reasoning_fr TEXT,
      confidence INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      sources_json JSONB,
      keywords_json JSONB,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `);

  // Migration: Add RAG columns if they don't exist (for existing tables)
  try {
    await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'answers' AND column_name = 'suggested_answer'
          ) THEN
              ALTER TABLE answers ADD COLUMN suggested_answer TEXT;
          END IF;
      END $$
    `);
    console.log('✅ Migration: suggested_answer column added to answers table');
  } catch (error) {
    console.log('ℹ️  suggested_answer column already exists or migration not needed');
  }

  try {
    await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'answers' AND column_name = 'user_answer'
          ) THEN
              ALTER TABLE answers ADD COLUMN user_answer TEXT;
          END IF;
      END $$
    `);
    console.log('✅ Migration: user_answer column added to answers table');
  } catch (error) {
    console.log('ℹ️  user_answer column already exists or migration not needed');
  }

  try {
    await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'answers' AND column_name = 'reasoning_fr'
          ) THEN
              ALTER TABLE answers ADD COLUMN reasoning_fr TEXT;
          END IF;
      END $$
    `);
    console.log('✅ Migration: reasoning_fr column added to answers table');
  } catch (error) {
    console.log('ℹ️  reasoning_fr column already exists or migration not needed');
  }

  try {
    await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'answers' AND column_name = 'confidence'
          ) THEN
              ALTER TABLE answers ADD COLUMN confidence INTEGER DEFAULT 0;
          END IF;
      END $$
    `);
    console.log('✅ Migration: confidence column added to answers table');
  } catch (error) {
    console.log('ℹ️  confidence column already exists or migration not needed');
  }

  try {
    await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'answers' AND column_name = 'keywords_json'
          ) THEN
              ALTER TABLE answers ADD COLUMN keywords_json JSONB;
          END IF;
      END $$
    `);
    console.log('✅ Migration: keywords_json column added to answers table');
  } catch (error) {
    console.log('ℹ️  keywords_json column already exists or migration not needed');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS final_checks (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      score REAL,
      status TEXT,
      issues_json JSONB,
      corrections_json JSONB,
      sources_json JSONB,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      page_number INTEGER,
      metadata_json JSONB,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (document_id) REFERENCES documents(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS final_reports (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      summary_json JSONB,
      final_text TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `);
}

// Helper function to check if we're using PostgreSQL
function isPostgreSQL(db: any): db is Pool {
  return db && typeof db.connect === 'function';
}

// Document operations
export async function saveDocumentToDb(doc: any) {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && isPostgreSQL(db)) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO documents (id, name, type, pages, content, uploaded_at, is_exercise, is_laws) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET name=$2, type=$3, pages=$4, content=$5, uploaded_at=$6, is_exercise=$7, is_laws=$8',
        [doc.id, doc.name, doc.type, doc.pages || null, doc.content, doc.uploadedAt, doc.isExercise ? 1 : 0, doc.isLaws ? 1 : 0]
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
  const db = await getDatabase() as Database.Database;
  const stmt = db.prepare('SELECT * FROM documents');
  const rows = stmt.all() as any[];
  return rows.map(row => ({
    ...row,
    isExercise: row.is_exercise === 1,
    isLaws: row.is_laws === 1,
    uploadedAt: row.uploaded_at
  }));
}

export async function clearAllDocumentsFromDb() {
  const db = await getDatabase() as Database.Database;
  db.prepare('DELETE FROM documents').run();
}

// Generated answers operations
export async function saveGeneratedAnswer(answer: any) {
  const db = await getDatabase() as Database.Database;
  const stmt = db.prepare(`
    INSERT INTO generated_answers (question_id, question, answer, sources, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(answer.questionId, answer.question, answer.answer, JSON.stringify(answer.sources), answer.createdAt);
}

export async function getAllGeneratedAnswersFromDb() {
  const db = await getDatabase() as Database.Database;
  const stmt = db.prepare('SELECT * FROM generated_answers ORDER BY created_at DESC');
  const rows = stmt.all() as any[];
  return rows.map(row => ({
    questionText: row.question,
    answer: row.answer,
    questionId: row.question_id,
    sources: typeof row.sources === 'string' ? JSON.parse(row.sources) : row.sources,
    createdAt: row.created_at
  }));
}

// Exercise document operations
export async function saveExerciseDocumentToDb(doc: any) {
  const db = await getDatabase() as Database.Database;
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO exercise_document (id, name, type, pages, content, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(doc.id, doc.name, doc.type, doc.pages || null, doc.content, doc.uploadedAt);
}

export async function getExerciseDocumentFromDb() {
  const db = await getDatabase() as Database.Database;
  const stmt = db.prepare('SELECT * FROM exercise_document LIMIT 1');
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

// Laws document operations
export async function saveLawsDocumentToDb(doc: any) {
  const db = await getDatabase() as Database.Database;
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO laws_document (id, name, type, pages, content, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(doc.id, doc.name, doc.type, doc.pages || null, doc.content, doc.uploadedAt);
}

export async function getLawsDocumentFromDb() {
  const db = await getDatabase() as Database.Database;
  const stmt = db.prepare('SELECT * FROM laws_document LIMIT 1');
  const row = stmt.get() as any;
  if (!row) return null;
  return {
    ...row,
    uploadedAt: row.uploaded_at
  };
}

export async function saveVerificationResult(result: any) {
  const db = await getDatabase() as Database.Database;
  const stmt = db.prepare(`
    INSERT INTO verification_results (question_id, question, answer, verification_score, is_correct, missing_sources, incorrect_facts, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(result.questionId, result.question, result.answer, result.score, result.isCorrect ? 1 : 0, JSON.stringify(result.missingSources), JSON.stringify(result.incorrectFacts), result.createdAt);
}

export async function getAllVerificationResults() {
  const db = await getDatabase() as Database.Database;
  const stmt = db.prepare('SELECT * FROM verification_results ORDER BY created_at DESC');
  const rows = stmt.all() as any[];
  return rows.map(row => ({
    ...row,
    missingSources: JSON.parse(row.missing_sources || '[]'),
    incorrectFacts: JSON.parse(row.incorrect_facts || '[]'),
    isCorrect: row.is_correct === 1
  }));
}

export async function clearVerificationResults() {
  const db = await getDatabase() as Database.Database;
  db.prepare('DELETE FROM verification_results').run();
}

// Session functions
export async function createSession(title: string = 'Session sans titre') {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  if (isProduction && isPostgreSQL(db)) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO sessions (id, title, created_at, updated_at, status) VALUES ($1, $2, $3, $4, $5)',
        [sessionId, title, now, now, 'active']
      );
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare('INSERT INTO sessions (id, title, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?)');
    stmt.run(sessionId, title, now, now, 'active');
  }
  return sessionId;
}

export async function getSession(sessionId: string) {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && isPostgreSQL(db)) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare('SELECT * FROM sessions WHERE id = ?');
    const row = stmt.get(sessionId) as any;
    return row || null;
  }
}

export async function saveDocumentToSession(doc: any) {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && isPostgreSQL(db)) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO documents (id, session_id, type, filename, mimetype, extracted_text, character_count, page_count, chunks_count, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [doc.id, doc.sessionId, doc.type, doc.filename, doc.mimetype, doc.extractedText, doc.characterCount, doc.pageCount, doc.chunksCount, doc.status, doc.createdAt]
      );
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare(`
      INSERT INTO documents (id, session_id, type, filename, mimetype, extracted_text, character_count, page_count, chunks_count, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(doc.id, doc.sessionId, doc.type, doc.filename, doc.mimetype, doc.extractedText, doc.characterCount, doc.pageCount, doc.chunksCount, doc.status, doc.createdAt);
  }
}

export async function saveQuestionToSession(question: any) {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && isPostgreSQL(db)) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO questions (id, session_id, number, order_index, original_text, original_hebrew, cleaned_hebrew, french_translation, french_understanding, source, language, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
        [question.id, question.sessionId, question.number, question.orderIndex || question.number, question.originalText, question.originalHebrew || question.originalText, question.cleanedHebrew || '', question.frenchTranslation || '', question.frenchUnderstanding || '', question.source || 'auto', question.language, question.status, question.createdAt, question.updatedAt]
      );
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare(`
      INSERT INTO questions (id, session_id, number, order_index, original_text, original_hebrew, cleaned_hebrew, french_translation, french_understanding, source, language, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(question.id, question.sessionId, question.number, question.orderIndex || question.number, question.originalText, question.originalHebrew || question.originalText, question.cleanedHebrew || '', question.frenchTranslation || '', question.frenchUnderstanding || '', question.source || 'auto', question.language, question.status, question.createdAt, question.updatedAt);
  }
}

export async function saveAnswerToSession(answer: any) {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  const now = new Date().toISOString();
  
  if (isProduction && isPostgreSQL(db)) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO answers (id, session_id, question_id, suggested_answer, user_answer, reasoning_fr, confidence, status, sources_json, keywords_json, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO UPDATE SET suggested_answer=$4, user_answer=$5, reasoning_fr=$6, confidence=$7, status=$8, sources_json=$9, keywords_json=$10, updated_at=$12',
        [answer.id, answer.sessionId, answer.questionId, answer.suggestedAnswer, answer.userAnswer, answer.reasoningFr, answer.confidence || 0, answer.status || 'pending', JSON.stringify(answer.sources || []), JSON.stringify(answer.keywords || []), answer.createdAt, now]
      );
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare(`
      INSERT INTO answers (id, session_id, question_id, suggested_answer, user_answer, reasoning_fr, confidence, status, sources_json, keywords_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET suggested_answer=?, user_answer=?, reasoning_fr=?, confidence=?, status=?, sources_json=?, keywords_json=?, updated_at=?
    `);
    stmt.run(answer.id, answer.sessionId, answer.questionId, answer.suggestedAnswer, answer.userAnswer, answer.reasoningFr, answer.confidence || 0, answer.status || 'pending', JSON.stringify(answer.sources || []), JSON.stringify(answer.keywords || []), answer.createdAt, now,
             answer.suggestedAnswer, answer.userAnswer, answer.reasoningFr, answer.confidence || 0, answer.status || 'pending', JSON.stringify(answer.sources || []), JSON.stringify(answer.keywords || []), now);
  }
}

export async function saveFinalCheckToSession(check: any) {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && isPostgreSQL(db)) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO final_checks (id, session_id, question_id, score, status, issues_json, corrections_json, sources_json, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO UPDATE SET score=$4, status=$5, issues_json=$6, corrections_json=$7, sources_json=$8',
        [check.id, check.sessionId, check.questionId, check.score, check.status, JSON.stringify(check.issues), JSON.stringify(check.corrections), JSON.stringify(check.sources), check.createdAt]
      );
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare(`
      INSERT INTO final_checks (id, session_id, question_id, score, status, issues_json, corrections_json, sources_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET score=?, status=?, issues_json=?, corrections_json=?, sources_json=?
    `);
    stmt.run(check.id, check.sessionId, check.questionId, check.score, check.status, JSON.stringify(check.issues), JSON.stringify(check.corrections), JSON.stringify(check.sources), check.createdAt,
             check.score, check.status, JSON.stringify(check.issues), JSON.stringify(check.corrections), JSON.stringify(check.sources));
  }
}

export async function saveDocumentChunkToSession(chunk: any) {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && isPostgreSQL(db)) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO document_chunks (id, session_id, document_id, chunk_index, text, page_number, metadata_json, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [chunk.id, chunk.sessionId, chunk.documentId, chunk.chunkIndex, chunk.text, chunk.pageNumber, JSON.stringify(chunk.metadata), chunk.createdAt]
      );
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare(`
      INSERT INTO document_chunks (id, session_id, document_id, chunk_index, text, page_number, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(chunk.id, chunk.sessionId, chunk.documentId, chunk.chunkIndex, chunk.text, chunk.pageNumber, JSON.stringify(chunk.metadata), chunk.createdAt);
  }
}

export async function updateQuestionTranslation(questionId: string, cleanedHebrew: string, frenchTranslation: string, frenchUnderstanding: string) {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && isPostgreSQL(db)) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      await client.query(`
        UPDATE questions 
        SET cleaned_hebrew = $1, french_translation = $2, french_understanding = $3, updated_at = NOW()
        WHERE id = $4
      `, [cleanedHebrew, frenchTranslation, frenchUnderstanding, questionId]);
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare(`
      UPDATE questions 
      SET cleaned_hebrew = ?, french_translation = ?, french_understanding = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(cleanedHebrew, frenchTranslation, frenchUnderstanding, new Date().toISOString(), questionId);
  }
}

export async function getSessionData(sessionId: string) {
  const db = await getDatabase();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && isPostgreSQL(db)) {
    const pool = db as Pool;
    const client = await pool.connect();
    try {
      const session = await client.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
      const documents = await client.query('SELECT * FROM documents WHERE session_id = $1', [sessionId]);
      const questions = await client.query('SELECT * FROM questions WHERE session_id = $1 ORDER BY number', [sessionId]);
      const answers = await client.query('SELECT * FROM answers WHERE session_id = $1', [sessionId]);
      const finalChecks = await client.query('SELECT * FROM final_checks WHERE session_id = $1', [sessionId]);
      const chunks = await client.query('SELECT * FROM document_chunks WHERE session_id = $1 ORDER BY chunk_index', [sessionId]);
      const finalReport = await client.query('SELECT * FROM final_reports WHERE session_id = $1', [sessionId]);

      return {
        session: session.rows[0] || null,
        documents: documents.rows,
        questions: questions.rows,
        answers: answers.rows,
        finalChecks: finalChecks.rows,
        chunks: chunks.rows,
        finalReport: finalReport.rows[0] || null
      };
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const session = sqlite.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as any;
    const documents = sqlite.prepare('SELECT * FROM documents WHERE session_id = ?').all(sessionId) as any[];
    const questions = sqlite.prepare('SELECT * FROM questions WHERE session_id = ? ORDER BY number').all(sessionId) as any[];
    const answers = sqlite.prepare('SELECT * FROM answers WHERE session_id = ?').all(sessionId) as any[];
    const finalChecks = sqlite.prepare('SELECT * FROM final_checks WHERE session_id = ?').all(sessionId) as any[];
    const chunks = sqlite.prepare('SELECT * FROM document_chunks WHERE session_id = ? ORDER BY chunk_index').all(sessionId) as any[];
    const finalReport = sqlite.prepare('SELECT * FROM final_reports WHERE session_id = ?').get(sessionId) as any;

    return {
      session,
      documents,
      questions,
      answers,
      finalChecks,
      chunks,
      finalReport: finalReport || null
    };
  }
}

export async function getSessionProgress(sessionId: string) {
  const data = await getSessionData(sessionId);
  const totalQuestions = data.questions.length;
  const generatedAnswers = data.answers.filter((a: any) => a.status === 'completed').length;
  const verifiedAnswers = data.finalChecks.length;

  return {
    sessionId,
    totalQuestions,
    generatedAnswers,
    verifiedAnswers,
    status: data.session?.status || 'unknown',
    updatedAt: data.session?.updated_at
  };
}
