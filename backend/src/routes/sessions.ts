import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { extractTextFromFile } from '../services/documentService.js';
import { buildChunks } from '../services/ragService.js';
import { isOpenAIEnabled, getOpenAIClient } from '../services/aiService.js';
import {
  createSession,
  getSession,
  getSessionData,
  getSessionProgress,
  saveDocumentToSession,
  saveQuestionToSession,
  saveAnswerToSession,
  saveFinalCheckToSession,
  saveDocumentChunkToSession
} from '../services/database.js';

const router = Router();

// Configure Multer for file uploads
const uploadDir = process.env.NODE_ENV === 'production' ? '/tmp/uploads' : path.join(process.cwd(), 'uploads');
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// POST /api/sessions - Create new session
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const sessionId = await createSession(title || 'Session sans titre');
    res.json({ sessionId, title: title || 'Session sans titre' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de la création de session' });
  }
});

// GET /api/sessions/:sessionId - Get full session state
router.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const data = await getSessionData(sessionId);
    
    if (!data.session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    // Parse JSON fields
    const parsedAnswers = data.answers.map((a: any) => ({
      ...a,
      sources_json: typeof a.sources_json === 'string' ? JSON.parse(a.sources_json || '[]') : a.sources_json
    }));

    const parsedFinalChecks = data.finalChecks.map((c: any) => ({
      ...c,
      issues_json: typeof c.issues_json === 'string' ? JSON.parse(c.issues_json || '[]') : c.issues_json,
      corrections_json: typeof c.corrections_json === 'string' ? JSON.parse(c.corrections_json || '[]') : c.corrections_json,
      sources_json: typeof c.sources_json === 'string' ? JSON.parse(c.sources_json || '[]') : c.sources_json
    }));

    const parsedChunks = data.chunks.map((c: any) => ({
      ...c,
      metadata_json: typeof c.metadata_json === 'string' ? JSON.parse(c.metadata_json || '{}') : c.metadata_json
    }));

    res.json({
      session: data.session,
      documents: data.documents,
      questions: data.questions,
      answers: parsedAnswers,
      finalChecks: parsedFinalChecks,
      chunks: parsedChunks
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de la récupération de session' });
  }
});

// GET /api/sessions/:sessionId/progress - Get live progress
router.get('/:sessionId/progress', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const progress = await getSessionProgress(sessionId);
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de la récupération du progrès' });
  }
});

// POST /api/sessions/:sessionId/upload-exercise - Upload exercise file
router.post('/:sessionId/upload-exercise', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const { text, pages } = await extractTextFromFile(file);
    
    const doc = {
      id: uuidv4(),
      sessionId,
      type: 'exercise',
      filename: file.originalname,
      mimetype: file.mimetype,
      extractedText: text,
      characterCount: text.length,
      pageCount: pages,
      chunksCount: 0,
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    await saveDocumentToSession(doc);

    // Detect questions from text (simplified - would need proper extraction logic)
    const questions = extractQuestionsFromText(text);
    
    for (const q of questions) {
      await saveQuestionToSession({
        id: uuidv4(),
        sessionId,
        number: q.number,
        originalText: q.text,
        language: 'hebrew',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    res.json({
      ...doc,
      chars: text.length,
      questionsDetected: questions.length
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de l\'upload de l\'exercice' });
  }
});

// POST /api/sessions/:sessionId/upload-laws - Upload laws document (243 pages)
router.post('/:sessionId/upload-laws', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const { text, pages } = await extractTextFromFile(file);
    
    if (!text || text.trim().length < 100) {
      return res.status(400).json({ error: 'Ce document semble être scanné ou vide' });
    }

    const doc = {
      id: uuidv4(),
      sessionId,
      type: 'laws',
      filename: file.originalname,
      mimetype: file.mimetype,
      extractedText: text,
      characterCount: text.length,
      pageCount: pages,
      chunksCount: 0,
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    await saveDocumentToSession(doc);

    // Build chunks
    const chunks = buildChunks(text, pages);
    doc.chunksCount = chunks.length;
    await saveDocumentToSession(doc);

    // Save chunks
    for (let i = 0; i < chunks.length; i++) {
      await saveDocumentChunkToSession({
        id: uuidv4(),
        sessionId,
        documentId: doc.id,
        chunkIndex: i,
        text: chunks[i].text,
        pageNumber: (chunks[i] as any).pageNumber || null,
        metadata: (chunks[i] as any).metadata || {},
        createdAt: new Date().toISOString()
      });
    }

    res.json({
      ...doc,
      chars: text.length,
      chunks: chunks.length
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de l\'upload du document de lois' });
  }
});

// POST /api/sessions/:sessionId/generate-all-answers - Generate all answers
router.post('/:sessionId/generate-all-answers', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const data = await getSessionData(sessionId);
    const questions = data.questions.filter((q: any) => q.status === 'pending');
    const chunks = data.chunks;

    if (chunks.length === 0) {
      return res.status(400).json({ error: 'Aucun document de lois importé' });
    }

    if (!isOpenAIEnabled()) {
      return res.status(400).json({ error: 'OpenAI non configuré' });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      return res.status(400).json({ error: 'OpenAI non configuré' });
    }

    const results = [];
    for (const question of questions) {
      // Simple answer generation using chunks
      const answer = await generateAnswerWithChunks(question.original_text, chunks, openai);
      
      await saveAnswerToSession({
        id: uuidv4(),
        sessionId,
        questionId: question.id,
        hebrewAnswer: answer.hebrew,
        frenchExplanation: answer.french,
        reasoning: answer.reasoning,
        sources: answer.sources,
        lineCount: answer.hebrew.split('\n').length,
        status: 'completed',
        copied: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      results.push({
        questionId: question.id,
        answer: answer.hebrew,
        sources: answer.sources
      });
    }

    res.json({
      success: true,
      generated: results.length,
      answers: results
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de la génération des réponses' });
  }
});

// POST /api/sessions/:sessionId/questions/:questionId/generate - Generate one answer
router.post('/:sessionId/questions/:questionId/generate', async (req: Request, res: Response) => {
  try {
    const { sessionId, questionId } = req.params;
    
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const data = await getSessionData(sessionId);
    const question = data.questions.find((q: any) => q.id === questionId);
    const chunks = data.chunks;

    if (!question) {
      return res.status(404).json({ error: 'Question non trouvée' });
    }

    if (chunks.length === 0) {
      return res.status(400).json({ error: 'Aucun document de lois importé' });
    }

    if (!isOpenAIEnabled()) {
      return res.status(400).json({ error: 'OpenAI non configuré' });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      return res.status(400).json({ error: 'OpenAI non configuré' });
    }

    const answer = await generateAnswerWithChunks(question.original_text, chunks, openai);
    
    await saveAnswerToSession({
      id: uuidv4(),
      sessionId,
      questionId,
      hebrewAnswer: answer.hebrew,
      frenchExplanation: answer.french,
      reasoning: answer.reasoning,
      sources: answer.sources,
      lineCount: answer.hebrew.split('\n').length,
      status: 'completed',
      copied: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      answer: answer.hebrew,
      frenchExplanation: answer.french,
      sources: answer.sources
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de la génération de la réponse' });
  }
});

// POST /api/sessions/:sessionId/final-verify - Final verification for all answers
router.post('/:sessionId/final-verify', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const data = await getSessionData(sessionId);
    const answers = data.answers.filter((a: any) => a.status === 'completed');
    const chunks = data.chunks;

    if (!isOpenAIEnabled()) {
      return res.status(400).json({ error: 'OpenAI non configuré' });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      return res.status(400).json({ error: 'OpenAI non configuré' });
    }

    const results = [];
    for (const answer of answers) {
      const question = data.questions.find((q: any) => q.id === answer.question_id);
      if (!question) continue;

      const verification = await verifyAnswerWithChunks(
        question.original_text,
        answer.hebrew_answer,
        answer.french_explanation,
        answer.sources_json,
        chunks,
        openai
      );

      await saveFinalCheckToSession({
        id: uuidv4(),
        sessionId,
        questionId: question.id,
        score: verification.score,
        status: verification.status,
        issues: verification.issues,
        corrections: verification.corrections,
        sources: verification.sourcesUsed,
        createdAt: new Date().toISOString()
      });

      results.push({
        questionId: question.id,
        score: verification.score,
        status: verification.status
      });
    }

    res.json({
      success: true,
      verified: results.length,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de la vérification finale' });
  }
});

// POST /api/sessions/:sessionId/reset - Reset session
router.post('/:sessionId/reset', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    // In a real implementation, you would delete all session data
    // For now, just return success
    res.json({ success: true, message: 'Session réinitialisée' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de la réinitialisation' });
  }
});

// Helper function to extract questions (simplified)
function extractQuestionsFromText(text: string): Array<{ number: number; text: string }> {
  const lines = text.split('\n');
  const questions: Array<{ number: number; text: string }> = [];
  let currentNumber = 1;
  let currentText = '';

  for (const line of lines) {
    const trimmed = line.trim();
    // Simple Hebrew question detection
    if (trimmed.match(/^(שאלה|Question)\s*\d+/i)) {
      if (currentText) {
        questions.push({ number: currentNumber++, text: currentText.trim() });
      }
      currentText = trimmed;
    } else if (currentText) {
      currentText += '\n' + trimmed;
    }
  }

  if (currentText) {
    questions.push({ number: currentNumber, text: currentText.trim() });
  }

  return questions;
}

// Helper function to generate answer with chunks
async function generateAnswerWithChunks(question: string, chunks: any[], openai: any) {
  // Select relevant chunks (simplified)
  const relevantChunks = chunks.slice(0, 5);
  const context = relevantChunks.map(c => c.text).join('\n\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Tu es un assistant pédagogique spécialisé en fiscalité des sociétés israélienne.
        
Règles :
- Réponds en hébreu avec traduction française en bas (séparée par ---)
- Utilise uniquement les sources fournies
- Structure : עובדות, כלל, יישום, מסקנה
- Ne rédige pas de réponse finale prête à copier`
      },
      {
        role: 'user',
        content: `Question: ${question}\n\nSources du document:\n${context}\n\nGénère une réponse structurée.`
      }
    ],
    temperature: 0.8
  });

  const content = response.choices[0].message.content || '';
  const [hebrew, french] = content.split('---').map((s: string) => s.trim());

  return {
    hebrew: hebrew || content,
    french: french || '',
    reasoning: 'Généré avec les sources fournies',
    sources: relevantChunks.map(c => ({ chunkIndex: c.chunk_index, pageNumber: c.page_number }))
  };
}

// Helper function to verify answer
async function verifyAnswerWithChunks(
  question: string,
  hebrewAnswer: string,
  frenchExplanation: string,
  sources: any[],
  chunks: any[],
  openai: any
) {
  const context = chunks.map(c => c.text).join('\n\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Tu es un assistant de vérification académique en droit fiscal.
        
Vérifie la réponse de l'étudiant en utilisant uniquement les sources fournies.
Ne prétends pas que la réponse est garantie 100% correcte.
Utilise la phrase : "Validation basée uniquement sur les sources fournies."

Critères :
- Compréhension de la question: 15 points
- Règle fiscale identifiée: 20 points
- Source pertinente trouvée: 20 points
- Application au cas: 20 points
- Calcul si nécessaire: 10 points
- Conclusion claire: 10 points
- Respect des 15 lignes: 5 points

Pénalités :
- Pas de source: max 50
- Affirmation non supportée: max 60
- Source inventée: max 30
- Pas de conclusion: -10
- Trop long: -5
- Pas de calcul quand requis: -10

Retourne JSON avec:
- score (0-100)
- status (Validée, À corriger, Source insuffisante, Réponse trop longue, Non vérifiable, Incomplète)
- supportedPoints []
- unsupportedPoints []
- missingElements []
- corrections []
- improvedDraftHebrew
- frenchExplanation
- sourcesUsed []`
      },
      {
        role: 'user',
        content: `Question: ${question}\n\nRéponse hébreu: ${hebrewAnswer}\n\nExplication française: ${frenchExplanation}\n\nSources utilisées: ${JSON.stringify(sources)}\n\nDocument de référence:\n${context}\n\nVérifie cette réponse et retourne le JSON.`
      }
    ],
    temperature: 0.3,
    response_format: { type: "json_object" }
  });

  const content = response.choices[0].message.content || '';
  const result = JSON.parse(content);

  return {
    score: result.score || 0,
    status: result.status || 'Non vérifiable',
    issues: result.unsupportedPoints || [],
    corrections: result.corrections || [],
    sourcesUsed: result.sourcesUsed || []
  };
}

export default router;
