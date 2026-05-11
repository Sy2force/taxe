/**
 * RAG Service — Retrieval-Augmented Generation
 *
 * Splits the laws document into overlapping chunks, scores them against
 * the question using TF-IDF-style keyword matching (FR + HE), and returns
 * the top-N most relevant chunks as the sole context for answer generation.
 *
 * NO answer is ever generated without at least one chunk from the document.
 */

import OpenAI from 'openai';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Chunk {
  id: number;
  text: string;
  page: number;
  startChar: number;
  endChar: number;
}

export interface RankedChunk extends Chunk {
  score: number;
  matchedTerms: string[];
}

export interface RAGResult {
  answer: string;
  understanding: string;   // compréhension française de la question
  reasoning: string;       // pourquoi cette réponse
  keywordsHe: string[];    // mots-clés hébreux extraits
  keywordsFr: string[];    // mots-clés français extraits
  chunks: RankedChunk[];
  hasSource: boolean;
  noSourceMessage?: string;
}

// ─── Chunking ──────────────────────────────────────────────────────────────

const CHUNK_SIZE = 1400;   // characters per chunk — large enough to capture full legal clauses
const CHUNK_OVERLAP = 300; // overlap to avoid cutting rules mid-sentence

export function buildChunks(text: string, totalPages?: number): Chunk[] {
  const chunks: Chunk[] = [];
  let id = 0;

  for (let start = 0; start < text.length; start += CHUNK_SIZE - CHUNK_OVERLAP) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const chunkText = text.slice(start, end).trim();
    if (chunkText.length < 30) continue; // skip very short trailing chunks

    const page = totalPages
      ? Math.max(1, Math.ceil((start / text.length) * totalPages))
      : 1;

    chunks.push({ id: id++, text: chunkText, page, startChar: start, endChar: end });
    if (end >= text.length) break;
  }

  return chunks;
}

// ─── Query term extraction ──────────────────────────────────────────────────

const STOPWORDS_FR = new Set([
  'le','la','les','de','du','des','un','une','et','en','à','au','aux',
  'est','sont','par','pour','que','qui','dans','sur','avec','ou','il',
  'elle','ils','elles','nous','vous','se','sa','son','ses','ce','ces',
  'cet','cette','y','pas','ne','plus','mais','donc','or','ni','car',
  'je','tu','lui','leur','leurs','quel','quelle','quels','quelles',
]);

const STOPWORDS_HE = new Set([
  'של','את','על','אל','עם','כי','הם','הן','היא','הוא','אנחנו','הם',
  'זה','זו','אלה','אלו','כל','כן','לא','רק','גם','עוד','כבר','מה',
]);

export function extractQueryTerms(question: string): string[] {
  // Tokenise keeping Hebrew characters
  const tokens = question
    .split(/[\s\n\r.,;:!?()[\]{}"'«»—\-/\\]+/)
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length >= 2);

  return tokens.filter(t => {
    const isHebrew = /[\u0590-\u05FF]/.test(t);
    return isHebrew ? !STOPWORDS_HE.has(t) : !STOPWORDS_FR.has(t);
  });
}

// ─── Scoring ────────────────────────────────────────────────────────────────

function scoreChunk(chunk: Chunk, terms: string[]): { score: number; matchedTerms: string[] } {
  const lower = chunk.text.toLowerCase();
  let score = 0;
  const matched: string[] = [];

  for (const term of terms) {
    const isHebrewTerm = /[\u0590-\u05FF]/.test(term);
    // Count occurrences (TF)
    let pos = 0;
    let count = 0;
    while ((pos = lower.indexOf(term, pos)) !== -1) {
      count++;
      pos += term.length;
    }
    if (count > 0) {
      const tf = 1 + Math.log(1 + count); // log-TF
      score += isHebrewTerm ? tf * 1.5 : tf; // boost hébreu x1.5
      matched.push(term);
    }
  }

  // Boost if chunk contains section markers (סעיף / section / article / §)
  if (/סעיף|section|article|§/i.test(chunk.text)) score += 0.5;

  // Boost if chunk contains percentage or numeric tax rates
  if (/\d+\s*%/.test(chunk.text)) score += 0.3;

  return { score, matchedTerms: matched };
}

export function retrieveTopChunks(chunks: Chunk[], question: string, topK = 12): RankedChunk[] {
  const terms = extractQueryTerms(question);
  if (terms.length === 0) return [];

  const ranked: RankedChunk[] = chunks
    .map(c => {
      const { score, matchedTerms } = scoreChunk(c, terms);
      return { ...c, score, matchedTerms };
    })
    .filter(c => c.score >= 0.5) // seuil minimum pour éliminer les faux positifs
    .sort((a, b) => b.score - a.score);

  // Deduplicate by content (keep highest scored)
  const seen = new Set<string>();
  const deduped: RankedChunk[] = [];
  for (const c of ranked) {
    const key = c.text.substring(0, 80);
    if (!seen.has(key)) { seen.add(key); deduped.push(c); }
    if (deduped.length >= topK) break;
  }

  return deduped;
}

// ─── Answer generation ──────────────────────────────────────────────────────

const RAG_SYSTEM_PROMPT = `Tu es un assistant pédagogique expert en fiscalité des sociétés israélienne.

RÈGLES ABSOLUES :
1. Réponds UNIQUEMENT à partir des extraits du document fournis. N'utilise JAMAIS tes connaissances générales.
2. Si les extraits sont insuffisants : réponds EXACTEMENT "AUCUNE SOURCE SUFFISANTE : [raison]"
3. N'invente JAMAIS de loi, article, section, page, taux ou montant.
4. Réponds en français. Conserve l'hébreu original des termes techniques.
5. Ta réponse JSON doit contenir EXACTEMENT ces champs :

{
  "understanding": "Ce que la question demande en 1-2 phrases françaises claires.",
  "keywordsHe": ["mot1", "mot2"],
  "keywordsFr": ["mot1", "mot2"],
  "answer": "FAITS : ...\nRÈGLE : ...\nAPPLICATION : ...\nSOURCE : [doc], page X.\nCONCLUSION : ...",
  "reasoning": "Explication pédagogique : quels mots-clés ont été utilisés, quelle règle a été trouvée, comment elle s'applique."
}

6. Le champ "answer" doit être ≤ 15 lignes non vides, en français, directement copiable dans Word.
7. Si les extraits sont insuffisants, retourne uniquement : {"aucune_source": "raison"}
8. Aucun markdown dans les valeurs. Texte brut uniquement.`;

export async function generateAnswerWithRAG(
  question: string,
  chunks: Chunk[],
  totalPages: number | undefined,
  openaiClient: OpenAI | null,
): Promise<RAGResult> {
  const topChunks = retrieveTopChunks(chunks, question, 12);

  if (topChunks.length === 0) {
    return {
      answer: '', understanding: '', reasoning: '', keywordsHe: [], keywordsFr: [],
      chunks: [],
      hasSource: false,
      noSourceMessage: `Aucune source suffisante n'a été trouvée dans le document de lois. Impossible de générer une réponse fiable pour cette question.\n\nMots-clés essayés : ${extractQueryTerms(question).slice(0, 6).join(', ')}`,
    };
  }

  // Build context from top chunks
  const context = topChunks
    .map((c, i) => `[Extrait ${i + 1} — page ${c.page}]\n${c.text}`)
    .join('\n\n---\n\n');

  // If OpenAI available → use GPT with strict RAG prompt
  if (openaiClient) {
    try {
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: RAG_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `QUESTION :\n${question}\n\nEXTRAITS DU DOCUMENT DE LOIS FISCALES (seule source autorisée) :\n\n${context}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 1400,
      });

      const raw = response.choices[0].message.content || '';

      // Parse JSON response
      let parsed: Record<string, unknown> = {};
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch { /* fall through to local */ }

      if (parsed['aucune_source']) {
        return {
          answer: '', understanding: '', reasoning: '', keywordsHe: [], keywordsFr: [],
          chunks: topChunks, hasSource: false,
          noSourceMessage: String(parsed['aucune_source']),
        };
      }

      if (parsed['answer']) {
        const understanding = String(parsed['understanding'] || '');
        const reasoning = String(parsed['reasoning'] || '');
        const keywordsHe = Array.isArray(parsed['keywordsHe']) ? parsed['keywordsHe'].map(String) : [];
        const keywordsFr = Array.isArray(parsed['keywordsFr']) ? parsed['keywordsFr'].map(String) : [];
        const rawAnswer = String(parsed['answer']);

        const allLines = rawAnswer.split('\n');
        let kept = 0;
        const trimmed: string[] = [];
        for (const line of allLines) {
          trimmed.push(line);
          if (line.trim()) kept++;
          if (kept >= 15) break;
        }
        const answer = kept > 15 ? trimmed.join('\n') : rawAnswer;
        return { answer, understanding, reasoning, keywordsHe, keywordsFr, chunks: topChunks, hasSource: true };
      }

    } catch {
      // Fall through to local generation
    }
  }

  // Local generation (no OpenAI): build a structured answer from chunk texts
  const { answer, reasoning } = buildLocalAnswer(question, topChunks);
  const terms = extractQueryTerms(question);
  const keywordsHe = terms.filter(t => /[\u0590-\u05FF]/.test(t));
  const keywordsFr = terms.filter(t => !/[\u0590-\u05FF]/.test(t));
  const understanding = `Cette question porte sur : ${question.substring(0, 120)}${question.length > 120 ? '…' : ''}`;
  return { answer, understanding, reasoning, keywordsHe, keywordsFr, chunks: topChunks, hasSource: true };
}

function buildLocalAnswer(question: string, chunks: RankedChunk[]): { answer: string; reasoning: string } {
  const best = chunks[0];
  const second = chunks[1];

  // Extract a clean rule snippet from the best chunk (first 400 chars)
  const ruleSnippet = best.text.replace(/\s+/g, ' ').substring(0, 400);
  const sourceSnippet = second
    ? second.text.replace(/\s+/g, ' ').substring(0, 250)
    : null;

  const lines: string[] = [
    `FAITS : La question porte sur : ${question.substring(0, 100)}${question.length > 100 ? '…' : ''}`,
    '',
    `RÈGLE : Extrait du document (page ${best.page}) :`,
    `« ${ruleSnippet}${best.text.length > 400 ? '…' : ''} »`,
    '',
    sourceSnippet ? `Élément complémentaire (page ${second!.page}) : « ${sourceSnippet} »` : '',
    '',
    'APPLICATION : Appliquez la règle identifiée ci-dessus aux faits de la question.',
    'Si un calcul est demandé : utilisez le taux cité dans l’extrait et montrez les étapes.',
    '',
    `SOURCE : ${_lawsDocumentName || 'Document de lois fiscales'}, page ${best.page}.`,
    '',
    'CONCLUSION : Identifiez l’événement fiscal, qui est imposé, le montant et le taux applicable selon le document.',
  ];

  // Return max 15 non-empty lines
  const nonEmpty = lines.filter(l => l.trim());
  const answer = nonEmpty.slice(0, 15).join('\n');
  const reasoning = `Mots-clés identifiés dans la question. Source principale : page ${best.page} (score ${best.score.toFixed(1)}). ` +
    `Termes appariés : ${best.matchedTerms.slice(0, 5).join(', ') || 'aucun'}. ` +
    (second ? `Source secondaire : page ${second.page}.` : '');
  return { answer, reasoning };
}

// ─── In-memory chunk store ──────────────────────────────────────────────────

let _lawsChunks: Chunk[] = [];
let _lawsDocumentName = '';
let _lawsTotalPages: number | undefined;

export function storeLawsChunks(chunks: Chunk[], name: string, pages?: number): void {
  _lawsChunks = chunks;
  _lawsDocumentName = name;
  _lawsTotalPages = pages;
}

export function getLawsChunks(): Chunk[] { return _lawsChunks; }
export function getLawsDocumentName(): string { return _lawsDocumentName; }
export function getLawsTotalPages(): number | undefined { return _lawsTotalPages; }
export function clearLawsChunks(): void {
  _lawsChunks = [];
  _lawsDocumentName = '';
  _lawsTotalPages = undefined;
}
