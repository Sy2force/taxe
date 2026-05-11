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
      hebrew_answer TEXT,
      french_explanation TEXT,
      reasoning TEXT,
      sources_json TEXT,
      line_count INTEGER,
      status TEXT DEFAULT 'pending',
      copied INTEGER DEFAULT 0,
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      hebrew_answer TEXT,
      french_explanation TEXT,
      reasoning TEXT,
      sources_json JSONB,
      line_count INTEGER,
      status TEXT DEFAULT 'pending',
      copied BOOLEAN DEFAULT FALSE,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `);

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
        'INSERT INTO questions (id, session_id, number, original_text, cleaned_hebrew, french_understanding, language, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [question.id, question.sessionId, question.number, question.originalText, question.cleanedHebrew || '', question.frenchUnderstanding || '', question.language, question.status, question.createdAt, question.updatedAt]
      );
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare(`
      INSERT INTO questions (id, session_id, number, original_text, cleaned_hebrew, french_understanding, language, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(question.id, question.sessionId, question.number, question.originalText, question.cleanedHebrew || '', question.frenchUnderstanding || '', question.language, question.status, question.createdAt, question.updatedAt);
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
        'INSERT INTO answers (id, session_id, question_id, hebrew_answer, french_explanation, reasoning, sources_json, line_count, status, copied, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO UPDATE SET hebrew_answer=$4, french_explanation=$5, reasoning=$6, sources_json=$7, line_count=$8, status=$9, copied=$10, updated_at=$12',
        [answer.id, answer.sessionId, answer.questionId, answer.hebrewAnswer, answer.frenchExplanation, answer.reasoning, JSON.stringify(answer.sources), answer.lineCount, answer.status, answer.copied, answer.createdAt, now]
      );
    } finally {
      client.release();
    }
  } else {
    const sqlite = db as Database.Database;
    const stmt = sqlite.prepare(`
      INSERT INTO answers (id, session_id, question_id, hebrew_answer, french_explanation, reasoning, sources_json, line_count, status, copied, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET hebrew_answer=?, french_explanation=?, reasoning=?, sources_json=?, line_count=?, status=?, copied=?, updated_at=?
    `);
    stmt.run(answer.id, answer.sessionId, answer.questionId, answer.hebrewAnswer, answer.frenchExplanation, answer.reasoning, JSON.stringify(answer.sources), answer.lineCount, answer.status, answer.copied, answer.createdAt, now,
             answer.hebrewAnswer, answer.frenchExplanation, answer.reasoning, JSON.stringify(answer.sources), answer.lineCount, answer.status, answer.copied, now);
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
