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
  // Always use SQLite for local development
  await ensureDbDir();
  if (!sqliteDb) {
    sqliteDb = new Database(DB_PATH);
    initSQLite(sqliteDb);
  }
  return sqliteDb;
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

// Document operations
export async function saveDocumentToDb(doc: any) {
  const db = await getDatabase() as Database.Database;
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO documents (id, name, type, pages, content, uploaded_at, is_exercise, is_laws)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(doc.id, doc.name, doc.type, doc.pages || null, doc.content, doc.uploadedAt, doc.isExercise ? 1 : 0, doc.isLaws ? 1 : 0);
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
  const db = await getDatabase() as Database.Database;
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  const stmt = db.prepare('INSERT INTO sessions (id, title, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?)');
  stmt.run(sessionId, title, now, now, 'active');
  return sessionId;
}

export async function getSession(sessionId: string) {
  const db = await getDatabase() as Database.Database;
  const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
  const row = stmt.get(sessionId) as any;
  return row || null;
}

export async function saveDocumentToSession(doc: any) {
  const db = await getDatabase() as Database.Database;
  const stmt = db.prepare(`
    INSERT INTO documents (id, session_id, type, filename, mimetype, extracted_text, character_count, page_count, chunks_count, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(doc.id, doc.sessionId, doc.type, doc.filename, doc.mimetype, doc.extractedText, doc.characterCount, doc.pageCount, doc.chunksCount, doc.status, doc.createdAt);
}

export async function saveQuestionToSession(question: any) {
  const db = await getDatabase() as Database.Database;
  const stmt = db.prepare(`
    INSERT INTO questions (id, session_id, number, original_text, language, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(question.id, question.sessionId, question.number, question.originalText, question.language, question.status, question.createdAt, question.updatedAt);
}

export async function saveAnswerToSession(answer: any) {
  const db = await getDatabase() as Database.Database;
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO answers (id, session_id, question_id, hebrew_answer, french_explanation, reasoning, sources_json, line_count, status, copied, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET hebrew_answer=?, french_explanation=?, reasoning=?, sources_json=?, line_count=?, status=?, copied=?, updated_at=?
  `);
  stmt.run(answer.id, answer.sessionId, answer.questionId, answer.hebrewAnswer, answer.frenchExplanation, answer.reasoning, JSON.stringify(answer.sources), answer.lineCount, answer.status, answer.copied, answer.createdAt, now,
           answer.hebrewAnswer, answer.frenchExplanation, answer.reasoning, JSON.stringify(answer.sources), answer.lineCount, answer.status, answer.copied, now);
}

export async function saveFinalCheckToSession(check: any) {
  const db = await getDatabase() as Database.Database;
  const stmt = db.prepare(`
    INSERT INTO final_checks (id, session_id, question_id, score, status, issues_json, corrections_json, sources_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET score=?, status=?, issues_json=?, corrections_json=?, sources_json=?
  `);
  stmt.run(check.id, check.sessionId, check.questionId, check.score, check.status, JSON.stringify(check.issues), JSON.stringify(check.corrections), JSON.stringify(check.sources), check.createdAt,
           check.score, check.status, JSON.stringify(check.issues), JSON.stringify(check.corrections), JSON.stringify(check.sources));
}

export async function saveDocumentChunkToSession(chunk: any) {
  const db = await getDatabase() as Database.Database;
  const stmt = db.prepare(`
    INSERT INTO document_chunks (id, session_id, document_id, chunk_index, text, page_number, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(chunk.id, chunk.sessionId, chunk.documentId, chunk.chunkIndex, chunk.text, chunk.pageNumber, JSON.stringify(chunk.metadata), chunk.createdAt);
}

export async function getSessionData(sessionId: string) {
  const db = await getDatabase() as Database.Database;
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as any;
  const documents = db.prepare('SELECT * FROM documents WHERE session_id = ?').all(sessionId) as any[];
  const questions = db.prepare('SELECT * FROM questions WHERE session_id = ? ORDER BY number').all(sessionId) as any[];
  const answers = db.prepare('SELECT * FROM answers WHERE session_id = ?').all(sessionId) as any[];
  const finalChecks = db.prepare('SELECT * FROM final_checks WHERE session_id = ?').all(sessionId) as any[];
  const chunks = db.prepare('SELECT * FROM document_chunks WHERE session_id = ? ORDER BY chunk_index').all(sessionId) as any[];
  const finalReport = db.prepare('SELECT * FROM final_reports WHERE session_id = ?').get(sessionId) as any;

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
