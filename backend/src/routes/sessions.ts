import { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { extractTextFromFile } from '../services/documentService.js';
import { buildChunks } from '../services/ragService.js';
import { isOpenAIEnabled, getOpenAIClient } from '../services/aiService.js';
import { Pool } from 'pg';
import Database from 'better-sqlite3';
import {
  createSession,
  getSession,
  getSessionData,
  getSessionProgress,
  saveDocumentToSession,
  saveQuestionToSession,
  saveAnswerToSession,
  saveFinalCheckToSession,
  saveDocumentChunkToSession,
  updateQuestionTranslation,
  getDatabase
} from '../services/database.js';

const router = Router();

// Configure Multer for file uploads
const uploadDir = process.env.NODE_ENV === 'production' ? '/tmp/uploads' : path.join(process.cwd(), 'uploads');
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for large PDFs
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // Only accept PDF files
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont acceptés'));
    }
  }
});

// POST /api/sessions - Create new session
router.post('/', async (req: Request, res: Response) => {
  try {
    console.log("POST /api/sessions called", req.body);
    
    const { title } = req.body;
    const sessionId = await createSession(title || 'Session sans titre');
    
    console.log("Session created:", sessionId);
    
    res.status(201).json({
      success: true,
      session: {
        id: sessionId,
        title: title || 'Session sans titre',
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("POST /api/sessions failed:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la création de session'
    });
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
router.post('/:sessionId/upload-exercise', upload.single('file'), async (req: Request, res: Response) => {
  console.log("[UPLOAD_EXERCISE] start");
  console.time("[UPLOAD_EXERCISE] total");
  
  // Add timeout safety for entire upload process
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("UPLOAD_EXERCISE_TIMEOUT")), 120000)
  );
  
  try {
    const { sessionId } = req.params;
    const file = req.file;
    
    console.log("[UPLOAD_EXERCISE] file info:", {
      sessionId,
      hasFile: !!file,
      fileName: file?.originalname,
      mimeType: file?.mimetype,
      size: file?.size,
      path: file?.path
    });
    
    if (!file) {
      console.error("[UPLOAD_EXERCISE] ERROR: No file received");
      return res.status(400).json({ error: 'Aucun fichier reçu par le serveur.' });
    }

    const session = await getSession(sessionId);
    if (!session) {
      console.error("[UPLOAD_EXERCISE] ERROR: Session not found", sessionId);
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    console.log("[UPLOAD_EXERCISE] extracting text...");
    console.time("[UPLOAD_EXERCISE] pdf-parse");
    const { text, pages } = await Promise.race([
      extractTextFromFile(file),
      new Promise((_, reject) => setTimeout(() => reject(new Error("PDF_PARSE_TIMEOUT")), 30000))
    ]) as { text: string; pages: number };
    console.timeEnd("[UPLOAD_EXERCISE] pdf-parse");
    
    console.log("[UPLOAD_EXERCISE] extracted:", {
      textLength: text.length,
      pageCount: pages,
      textPreview: text.slice(0, 500)
    });
    
    if (text.length < 50) {
      console.error("[UPLOAD_EXERCISE] ERROR: Text too short, PDF might be scanned");
      console.timeEnd("[UPLOAD_EXERCISE] total");
      return res.status(400).json({ 
        error: 'Le PDF semble scanné ou sans texte exploitable. Le texte extrait est trop court.' 
      });
    }
    
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

    console.log("[UPLOAD_EXERCISE] saving document...");
    console.time("[UPLOAD_EXERCISE] save-db");
    await Promise.race([
      saveDocumentToSession(doc),
      new Promise((_, reject) => setTimeout(() => reject(new Error("DB_SAVE_TIMEOUT")), 10000))
    ]);
    console.timeEnd("[UPLOAD_EXERCISE] save-db");

    console.log("[UPLOAD_EXERCISE] detecting questions...");
    console.time("[UPLOAD_EXERCISE] detect-questions");
    const questions = extractQuestionsFromText(text);
    console.timeEnd("[UPLOAD_EXERCISE] detect-questions");
    
    console.log("[UPLOAD_EXERCISE] questions detected:", questions.length);
    
    if (questions.length === 0) {
      console.warn("[UPLOAD_EXERCISE] WARNING: No questions detected");
      console.timeEnd("[UPLOAD_EXERCISE] total");
      return res.json({
        ...doc,
        chars: text.length,
        questionsDetected: 0,
        warning: 'Le texte a été extrait, mais aucune question n\'a été détectée automatiquement. Utilisez le mode manuel pour diviser le texte.'
      });
    }

    // Prepare questions without blocking on OpenAI translation
    const enhancedQuestions: Array<{ number: number; text: string; cleanedHebrew: string; frenchTranslation: string; frenchUnderstanding: string }> = 
      questions.map(q => ({ 
        ...q, 
        cleanedHebrew: q.text, 
        frenchTranslation: 'Traduction en cours...', 
        frenchUnderstanding: '' 
      }));
    
    console.log("[UPLOAD_EXERCISE] saving questions...");
    console.time("[UPLOAD_EXERCISE] save-questions");
    await Promise.race([
      Promise.all(enhancedQuestions.map(q =>
        saveQuestionToSession({
          id: uuidv4(),
          sessionId,
          number: q.number,
          originalText: q.text,
          cleanedHebrew: q.cleanedHebrew,
          frenchTranslation: q.frenchTranslation,
          frenchUnderstanding: q.frenchUnderstanding,
          language: 'hebrew',
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      )),
      new Promise((_, reject) => setTimeout(() => reject(new Error("DB_SAVE_TIMEOUT")), 15000))
    ]);
    console.timeEnd("[UPLOAD_EXERCISE] save-questions");

    console.timeEnd("[UPLOAD_EXERCISE] total");
    console.log("[UPLOAD_EXERCISE] complete:", {
      questionsCount: questions.length,
      docId: doc.id
    });

    res.json({
      ...doc,
      extracted_text: text,
      chars: text.length,
      questionsDetected: questions.length
    });
  } catch (error) {
    console.error("[UPLOAD_EXERCISE] ERROR:", error);
    console.timeEnd("[UPLOAD_EXERCISE] total");
    
    if (error instanceof Error && error.message === "UPLOAD_EXERCISE_TIMEOUT") {
      return res.status(504).json({ 
        error: 'Le traitement prend trop de temps. Le PDF est peut-être très volumineux.' 
      });
    }
    
    if (error instanceof Error && error.message === "PDF_PARSE_TIMEOUT") {
      return res.status(504).json({ 
        error: 'L\'extraction du texte prend trop de temps. Le PDF est peut-être scanné.' 
      });
    }
    
    if (error instanceof Error && error.message === "DB_SAVE_TIMEOUT") {
      return res.status(504).json({ 
        error: 'La sauvegarde en base de données prend trop de temps.' 
      });
    }
    
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erreur lors de l\'upload de l\'exercice' 
    });
  }
});

// POST /api/sessions/:sessionId/questions/split-smart - Smart split questions
router.post('/:sessionId/questions/split-smart', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { expectedCount = 8 } = req.body;
    
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    // Get the exercise document
    const doc = await getDocumentBySession(sessionId, 'exercise');
    if (!doc) {
      return res.status(400).json({ error: 'Aucun document d\'exercice trouvé' });
    }

    const text = doc.extractedText || doc.extracted_text || '';
    if (!text) {
      return res.status(400).json({ error: 'Aucun texte extrait' });
    }

    // Smart split into expectedCount questions
    const questions = smartSplitIntoQuestions(text, expectedCount);

    // Clear existing questions
    await deleteQuestionsBySession(sessionId);

    // Save new questions in parallel for speed
    await Promise.all(questions.map(q =>
      saveQuestionToSession({
        id: uuidv4(),
        sessionId,
        number: q.number,
        originalText: q.text,
        cleanedHebrew: q.text,
        frenchUnderstanding: '',
        language: 'hebrew',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    ));

    await refreshSessionData(sessionId);

    res.json({
      success: true,
      questionsCount: questions.length
    });
  } catch (error) {
    console.error("POST /api/sessions/:sessionId/questions/split-smart failed:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors du découpage intelligent'
    });
  }
});

// POST /api/sessions/:sessionId/questions/translate-all - Translate all questions
router.post('/:sessionId/questions/translate-all', async (req: Request, res: Response) => {
  console.log("[TRANSLATE_ALL] start");
  console.time("[TRANSLATE_ALL] total");
  
  try {
    const { sessionId } = req.params;
    
    const session = await getSession(sessionId);
    if (!session) {
      console.error("[TRANSLATE_ALL] ERROR: Session not found", sessionId);
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const data = await getSessionData(sessionId);
    const questions = data.questions.filter((q: any) => 
      !q.french_translation || q.french_translation === 'Traduction en cours...' || q.french_translation === 'Traduction indisponible'
    );

    console.log("[TRANSLATE_ALL] questions to translate:", questions.length);

    if (!isOpenAIEnabled()) {
      console.warn("[TRANSLATE_ALL] OpenAI not enabled");
      console.timeEnd("[TRANSLATE_ALL] total");
      return res.json({ 
        success: false, 
        error: 'OpenAI non configuré' 
      });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      console.error("[TRANSLATE_ALL] ERROR: OpenAI client not available");
      console.timeEnd("[TRANSLATE_ALL] total");
      return res.json({ 
        success: false, 
        error: 'Client OpenAI non disponible' 
      });
    }

    const translatedQuestions = [];
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      console.log(`[TRANSLATE_ALL] translating question ${i + 1}/${questions.length}`);
      console.time(`[TRANSLATE_ALL] q-${i + 1}`);
      
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("TRANSLATE_TIMEOUT")), 15000)
        );

        const translatePromise = openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Tu es un assistant qui traite des questions en hébreu.
                
Pour chaque question, retourne un JSON avec:
{
  "cleanedHebrew": "question réécrite proprement en hébreu (même sens, formatage propre, sans erreurs)",
  "frenchTranslation": "traduction française exacte de la question (conserve le sens fiscal/juridique)",
  "frenchUnderstanding": "explication en français de ce que la question demande"
}

Règles IMPORTANTES:
- Conserver le sens exact de la question
- Améliorer le formatage et la structure
- Éliminer les artefacts de conversion PDF
- Traduire la question en français, NE PAS répondre à la question
- Écrire la traduction française clairement
- Écrire l'explication française clairement`
            },
            {
              role: 'user',
              content: `Question originale:\n${q.original_text}\n\nRéécris cette question de manière structurée, traduis-la en français et fournis l'explication en français. Retourne uniquement du JSON valide.`
            }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        });

        const response = await Promise.race([translatePromise, timeoutPromise]);
        const content = response.choices[0].message.content || '{}';
        const parsed = JSON.parse(content);
        
        const cleanedHebrew = parsed.cleanedHebrew || q.original_text;
        const frenchTranslation = parsed.frenchTranslation || 'Traduction française indisponible';
        const frenchUnderstanding = parsed.frenchUnderstanding || '';

        // Update question in DB
        await updateQuestionTranslation(q.id, cleanedHebrew, frenchTranslation, frenchUnderstanding);
        
        translatedQuestions.push({
          id: q.id,
          cleanedHebrew,
          frenchTranslation,
          frenchUnderstanding
        });
        
        console.timeEnd(`[TRANSLATE_ALL] q-${i + 1}`);
      } catch (error) {
        console.error(`[TRANSLATE_ALL] ERROR translating question ${i + 1}:`, error);
        console.timeEnd(`[TRANSLATE_ALL] q-${i + 1}`);
        
        // Fallback: mark as unavailable
        await updateQuestionTranslation(q.id, q.original_text, 'Traduction française indisponible', '');
        
        translatedQuestions.push({
          id: q.id,
          cleanedHebrew: q.original_text,
          frenchTranslation: 'Traduction française indisponible',
          frenchUnderstanding: ''
        });
      }
    }

    console.timeEnd("[TRANSLATE_ALL] total");
    console.log("[TRANSLATE_ALL] complete:", translatedQuestions.length);

    res.json({
      success: true,
      translatedCount: translatedQuestions.length,
      questions: translatedQuestions
    });
  } catch (error) {
    console.error("[TRANSLATE_ALL] ERROR:", error);
    console.timeEnd("[TRANSLATE_ALL] total");
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la traduction' 
    });
  }
});

// POST /api/sessions/:sessionId/upload-laws - Upload laws document (243 pages)
router.post('/:sessionId/upload-laws', upload.single('file'), async (req: Request, res: Response) => {
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

    // Build chunks
    const chunks = buildChunks(text, pages);
    doc.chunksCount = chunks.length;
    
    // Store chunks in database
    await saveDocumentToSession(doc);

    // Save chunks to database
    for (let i = 0; i < chunks.length; i++) {
      await saveDocumentChunkToSession({
        id: uuidv4(),
        sessionId,
        documentId: doc.id,
        chunkIndex: i,
        text: chunks[i].text,
        pageNumber: chunks[i].page,
        metadata: { startChar: chunks[i].startChar, endChar: chunks[i].endChar },
        createdAt: new Date().toISOString()
      });
    }

    // Store chunks in memory for RAG service
    const { storeLawsChunks } = await import('../services/ragService.js');
    storeLawsChunks(chunks, file.originalname, pages);

    res.json({
      ...doc,
      chars: text.length,
      chunks: chunks.length
    });
  } catch (error) {
    console.error('Error uploading laws:', error);
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
    // Format chunks for RAG service
    const chunks = data.chunks.map((c: any) => ({
      id: c.id,
      text: c.text,
      page: c.page_number || c.page || 0,
      startChar: c.start_char || 0,
      endChar: c.end_char || c.text.length
    }));

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
        sources: answer.sources || [],
        lineCount: answer.hebrew ? answer.hebrew.split('\n').length : 0,
        status: 'completed',
        copied: 0,
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

// POST /api/sessions/:sessionId/questions/:questionId/optimize - Optimize answer with instruction
router.post('/:sessionId/questions/:questionId/optimize', async (req: Request, res: Response) => {
  try {
    const { sessionId, questionId } = req.params;
    const { instruction } = req.body;
    
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const data = await getSessionData(sessionId);
    const question = data.questions.find((q: any) => q.id === questionId);
    const existingAnswer = data.answers.find((a: any) => a.question_id === questionId);
    const chunks = data.chunks;

    if (!question) {
      return res.status(404).json({ error: 'Question non trouvée' });
    }

    if (!existingAnswer) {
      return res.status(400).json({ error: 'Aucune réponse existante à optimiser' });
    }

    if (!isOpenAIEnabled()) {
      return res.status(400).json({ error: 'OpenAI non configuré' });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      return res.status(400).json({ error: 'OpenAI non configuré' });
    }

    // Build instruction-specific prompt
    let systemPrompt = 'Tu es un assistant pédagogique spécialisé en fiscalité des sociétés israélienne.';
    let userPrompt = '';

    switch (instruction) {
      case 'Optimiser':
        systemPrompt += '\n\nAméliore le brouillon hébreu en utilisant uniquement les sources existantes. Ne change pas les sources.';
        userPrompt = `Question: ${question.original_text}\nRéponse actuelle: ${existingAnswer.hebrew_answer}\nSources existantes: ${JSON.stringify(existingAnswer.sources_json)}\n\nAméliore la réponse.`;
        break;
      case 'Raccourcir à 15L':
        systemPrompt += '\n\nRaccourcis la réponse hébreu à maximum 15 lignes en conservant la règle, l\'application et la conclusion. Utilise uniquement les sources existantes.';
        userPrompt = `Question: ${question.original_text}\nRéponse actuelle: ${existingAnswer.hebrew_answer}\nSources existantes: ${JSON.stringify(existingAnswer.sources_json)}\n\nRaccourcis à 15 lignes maximum.`;
        break;
      case 'Rendre plus clair':
        systemPrompt += '\n\nRéécris la réponse hébreu en hébreu académique plus clair. Utilise uniquement les sources existantes.';
        userPrompt = `Question: ${question.original_text}\nRéponse actuelle: ${existingAnswer.hebrew_answer}\nSources existantes: ${JSON.stringify(existingAnswer.sources_json)}\n\nRends plus clair.`;
        break;
      case 'Expliquer simplement':
        systemPrompt += '\n\nExplique en français pourquoi la réponse suit des sources. Utilise uniquement les sources existantes.';
        userPrompt = `Question: ${question.original_text}\nRéponse actuelle: ${existingAnswer.hebrew_answer}\nExplication française: ${existingAnswer.french_explanation}\nSources existantes: ${JSON.stringify(existingAnswer.sources_json)}\n\nExplique simplement en français.`;
        break;
      case 'Vérifier la réponse':
        systemPrompt += '\n\nVérifie que la réponse est supportée par les sources et identifie les points non supportés. Utilise uniquement les sources existantes.';
        userPrompt = `Question: ${question.original_text}\nRéponse actuelle: ${existingAnswer.hebrew_answer}\nSources existantes: ${JSON.stringify(existingAnswer.sources_json)}\n\nVérifie la réponse.`;
        break;
      default:
        systemPrompt += '\n\nAméliore la réponse selon l\'instruction.';
        userPrompt = `Question: ${question.original_text}\nRéponse actuelle: ${existingAnswer.hebrew_answer}\nInstruction: ${instruction}\nSources existantes: ${JSON.stringify(existingAnswer.sources_json)}`;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
    });

    const content = response.choices[0].message.content || '';
    
    // If instruction is French explanation, update french_explanation
    if (instruction === 'Expliquer simplement') {
      await saveAnswerToSession({
        id: existingAnswer.id,
        sessionId,
        questionId,
        hebrewAnswer: existingAnswer.hebrew_answer,
        frenchExplanation: content,
        reasoning: existingAnswer.reasoning,
        sources: existingAnswer.sources_json,
        lineCount: existingAnswer.line_count,
        status: existingAnswer.status,
        copied: existingAnswer.copied,
        createdAt: existingAnswer.created_at,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Otherwise update hebrew_answer
      await saveAnswerToSession({
        id: existingAnswer.id,
        sessionId,
        questionId,
        hebrewAnswer: content,
        frenchExplanation: existingAnswer.french_explanation,
        reasoning: existingAnswer.reasoning,
        sources: existingAnswer.sources_json,
        lineCount: content.split('\n').length,
        status: content.split('\n').length > 15 ? 'needs_review' : existingAnswer.status,
        copied: existingAnswer.copied,
        createdAt: existingAnswer.created_at,
        updatedAt: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      instruction,
      updatedAnswer: instruction === 'Expliquer simplement' ? existingAnswer.french_explanation : content
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de l\'optimisation de la réponse' });
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

// POST /api/sessions/:sessionId/questions/validate - Save edited/validated questions
router.post('/:sessionId/questions/validate', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { questions } = req.body;
    
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Questions invalides' });
    }

    for (const q of questions) {
      await saveQuestionToSession({
        id: q.id || uuidv4(),
        sessionId,
        number: q.number || q.id,
        originalText: q.originalHebrew || q.text || '',
        originalHebrew: q.originalHebrew || q.text || '',
        frenchTranslation: q.frenchTranslation || '',
        frenchUnderstanding: q.frenchUnderstanding || '',
        answerLimitLines: q.answerLimitLines || 15,
        points: q.points || '',
        pageStart: q.pageStart,
        pageEnd: q.pageEnd,
        language: 'hebrew',
        status: q.status || 'pending',
        createdAt: q.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // Update session updated_at
    await updateSessionTimestamp(sessionId);

    const data = await getSessionData(sessionId);
    
    res.json({
      success: true,
      questions: data.questions,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de la validation des questions' });
  }
});

// Helper function to update session timestamp
async function updateSessionTimestamp(sessionId: string) {
  const db = await getDatabase() as Database.Database;
  db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), sessionId);
}

// POST /api/sessions/:sessionId/sync-exercise - Sync exercise data from local processing
router.post('/:sessionId/sync-exercise', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { extractedText, questions } = req.body;
    
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const doc = {
      id: uuidv4(),
      sessionId,
      type: 'exercise',
      filename: 'Exercice synchronisé',
      mimetype: 'text/plain',
      extractedText: extractedText || '',
      characterCount: extractedText?.length || 0,
      pageCount: 0,
      chunksCount: 0,
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    await saveDocumentToSession(doc);

    if (questions && Array.isArray(questions)) {
      for (const q of questions) {
        await saveQuestionToSession({
          id: q.id || uuidv4(),
          sessionId,
          number: q.number || q.id,
          originalText: q.originalHebrew || q.text || '',
          originalHebrew: q.originalHebrew || q.text || '',
          frenchTranslation: q.frenchTranslation || '',
          frenchUnderstanding: q.frenchUnderstanding || '',
          answerLimitLines: q.answerLimitLines || 15,
          points: q.points || '',
          pageStart: q.pageStart,
          pageEnd: q.pageEnd,
          language: 'hebrew',
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      document: doc,
      questionsSaved: questions?.length || 0
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de la synchronisation de l\'exercice' });
  }
});

// POST /api/sessions/:sessionId/sync-laws - Sync laws data from local processing
router.post('/:sessionId/sync-laws', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { extractedText, chunks, pageCount } = req.body;
    
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const doc = {
      id: uuidv4(),
      sessionId,
      type: 'laws',
      filename: 'Lois synchronisées',
      mimetype: 'text/plain',
      extractedText: extractedText || '',
      characterCount: extractedText?.length || 0,
      pageCount: pageCount || 0,
      chunksCount: chunks?.length || 0,
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    await saveDocumentToSession(doc);

    if (chunks && Array.isArray(chunks)) {
      for (let i = 0; i < chunks.length; i++) {
        await saveDocumentChunkToSession({
          id: uuidv4(),
          sessionId,
          documentId: doc.id,
          chunkIndex: i,
          text: chunks[i].text || chunks[i],
          pageNumber: chunks[i].pageNumber || null,
          metadata: chunks[i].metadata || {},
          createdAt: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      document: doc,
      chunksSaved: chunks?.length || 0
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de la synchronisation des lois' });
  }
});

// POST /api/sessions/:sessionId/upload-final-document - Upload completed assignment
router.post('/:sessionId/upload-final-document', upload.single('file'), async (req: Request, res: Response) => {
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
      return res.status(400).json({ error: 'Ce document semble être scanné ou vide. Aucun texte exploitable n\'a été trouvé.' });
    }

    const doc = {
      id: uuidv4(),
      sessionId,
      type: 'final',
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

    // Try to detect student answers
    const answers = detectStudentAnswers(text);
    
    if (answers.length === 0) {
      return res.json({
        ...doc,
        chars: text.length,
        answersDetected: 0,
        warning: 'Le document a été lu, mais les réponses n\'ont pas été détectées automatiquement. Vous pouvez les associer manuellement.'
      });
    }
    
    // Save detected answers
    for (const answer of answers) {
      await saveAnswerToSession({
        id: uuidv4(),
        sessionId,
        questionId: answer.questionId,
        hebrewAnswer: answer.studentAnswer,
        frenchExplanation: '',
        reasoning: '',
        sources: [],
        lineCount: answer.lineCount,
        status: 'completed',
        copied: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    res.json({
      ...doc,
      chars: text.length,
      answersDetected: answers.length
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de l\'upload du document final' });
  }
});

// POST /api/sessions/:sessionId/correct-final-document - Analyze completed document against laws
router.post('/:sessionId/correct-final-document', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const data = await getSessionData(sessionId);
    const questions = data.questions;
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
      const question = questions.find((q: any) => q.id === answer.question_id);
      if (!question) continue;

      const correction = await correctAnswerWithChunks(
        question.original_text || question.originalHebrew,
        answer.hebrew_answer,
        chunks,
        openai
      );

      await saveFinalCheckToSession({
        id: uuidv4(),
        sessionId,
        questionId: question.id,
        score: correction.score,
        status: correction.status,
        issues: correction.issues,
        corrections: correction.corrections,
        sources: correction.sourcesUsed,
        createdAt: new Date().toISOString()
      });

      results.push({
        questionId: question.id,
        questionNumber: question.number,
        score: correction.score,
        status: correction.status
      });
    }

    res.json({
      success: true,
      corrected: results.length,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de la correction du document final' });
  }
});

// GET /api/sessions/:sessionId/final - Load final report
router.get('/:sessionId/final', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const data = await getSessionData(sessionId);
    
    if (!data.session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    res.json({
      session: data.session,
      documents: data.documents,
      questions: data.questions,
      answers: data.answers,
      finalChecks: data.finalChecks,
      finalReport: data.finalReport
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors du chargement du rapport final' });
  }
});

// POST /api/sessions/:sessionId/final - Generate/save final report
router.post('/:sessionId/final', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const data = await getSessionData(sessionId);
    
    const finalReport = {
      id: uuidv4(),
      sessionId,
      summary: {
        totalQuestions: data.questions.length,
        generatedAnswers: data.answers.length,
        verifiedAnswers: data.finalChecks.length,
        averageScore: data.finalChecks.length > 0 
          ? data.finalChecks.reduce((sum: number, c: any) => sum + (c.score || 0), 0) / data.finalChecks.length 
          : 0
      },
      finalText: `Rapport final pour la session ${sessionId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save final report to database
    // (Implementation depends on database service having saveFinalReport function)

    res.json({
      success: true,
      finalReport
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de la génération du rapport final' });
  }
});

// Helper function to extract questions with improved Hebrew detection
function extractQuestionsFromText(text: string): Array<{ number: number; text: string; source: string }> {
  console.log("[EXTRACT_QUESTIONS] start");
  console.time("[EXTRACT_QUESTIONS] total");
  console.log("[EXTRACT_QUESTIONS] text length:", text.length);
  
  const normalized = text
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Stop before this marker
  const stopMarker = 'קווים מנחים להגשת עבודה אקדמית';
  const stopIndex = normalized.indexOf(stopMarker);
  const textToProcess = stopIndex !== -1 ? normalized.substring(0, stopIndex) : normalized;

  console.log("[EXTRACT_QUESTIONS] text to process length:", textToProcess.length);

  // Only write debug file in development, not production
  if (process.env.NODE_ENV !== 'production') {
    try {
      const fs = require('fs');
      const path = require('path');
      const debugDir = path.join(process.cwd(), 'debug');
      const debugFile = path.join(debugDir, 'extracted-exercise.txt');
      
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      fs.writeFileSync(debugFile, textToProcess, 'utf8');
      console.log("[EXTRACT_QUESTIONS] debug file written");
    } catch (error) {
      console.log("[EXTRACT_QUESTIONS] could not write debug file:", error);
    }
  }

  // Improved question detection using marker-based splitting
  console.time("[EXTRACT_QUESTIONS] split-markers");
  const questions = splitByQuestionMarkers(textToProcess);
  console.timeEnd("[EXTRACT_QUESTIONS] split-markers");
  
  console.log("[EXTRACT_QUESTIONS] questions detected:", questions.length);
  
  if (questions.length > 0) {
    console.timeEnd("[EXTRACT_QUESTIONS] total");
    return questions;
  }

  // Fallback: split by instruction paragraphs
  console.time("[EXTRACT_QUESTIONS] split-paragraphs");
  const paragraphQuestions = splitByInstructionParagraphs(textToProcess);
  console.timeEnd("[EXTRACT_QUESTIONS] split-paragraphs");
  console.log("[EXTRACT_QUESTIONS] paragraph questions detected:", paragraphQuestions.length);
  
  console.timeEnd("[EXTRACT_QUESTIONS] total");
  return paragraphQuestions;
}

function splitByQuestionMarkers(text: string): Array<{ number: number; text: string; source: string }> {
  // Comprehensive marker regex for Hebrew question indicators
  const markerRegex = /(?:^|\n)\s*(?:שאלה\s*(?:מספר)?\s*(?:\d+|[א-ת][׳']?)|(?:\d+)[.)]|[א-ת][.)]|סעיף\s*[א-ת]|חלק\s*[א-ת])/g;
  
  const matches = [...text.matchAll(markerRegex)];
  console.log('Marker matches found:', matches.length);
  
  if (matches.length < 2) {
    return [];
  }
  
  const questions: Array<{ number: number; text: string; source: string }> = [];
  
  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const nextMatch = matches[i + 1];
    
    const start = currentMatch.index;
    const end = nextMatch ? nextMatch.index : text.length;
    
    let block = text.slice(start, end).trim();
    
    // Filter valid questions
    if (block.length > 50 && /[א-ת]/.test(block)) {
      // Remove the marker from the block text
      const cleanBlock = block.replace(/^(?:שאלה\s*(?:מספר)?\s*(?:\d+|[א-ת][׳']?)|(?:\d+)[.)]|[א-ת][.)]|סעיף\s*[א-ת]|חלק\s*[א-ת])/, '').trim();
      
      questions.push({
        number: questions.length + 1,
        text: cleanBlock || block,
        source: "auto-marker"
      });
    }
  }
  
  return questions;
}

function splitByInstructionParagraphs(text: string): Array<{ number: number; text: string; source: string }> {
  const instructionKeywords = [
    'נדרש', 'הסבר', 'חשב', 'נמק', 'פרט', 'קבע', 'ציין', 'דון', 
    'נדרשת', 'הסבירו', 'חשבו', 'נמקו', 'קבעו', 'פרטו', 'ציינו'
  ];
  
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p =>
      p.length > 50 &&
      /[א-ת]/.test(p) &&
      instructionKeywords.some(keyword => p.includes(keyword))
    );
  
  return paragraphs.map((p, index) => ({
    number: index + 1,
    text: p,
    source: "auto-paragraph"
  }));
}

function smartSplitIntoQuestions(text: string, expectedCount: number): Array<{ number: number; text: string }> {
  const instructionKeywords = [
    'נדרש', 'הסבר', 'חשב', 'נמק', 'פרט', 'קבע', 'ציין', 'דון', 
    'נדרשת', 'הסבירו', 'חשבו', 'נמקו', 'קבעו', 'פרטו', 'ציינו'
  ];

  // Find all instruction keyword positions
  const keywordPositions: Array<{ index: number; keyword: string }> = [];
  instructionKeywords.forEach(keyword => {
    let pos = text.indexOf(keyword);
    while (pos !== -1) {
      keywordPositions.push({ index: pos, keyword });
      pos = text.indexOf(keyword, pos + 1);
    }
  });

  // Sort by position
  keywordPositions.sort((a, b) => a.index - b.index);

  // If we have enough keyword positions, use them as split points
  if (keywordPositions.length >= expectedCount) {
    const questions: Array<{ number: number; text: string }> = [];
    for (let i = 0; i < expectedCount; i++) {
      const start = keywordPositions[i].index;
      const end = i < expectedCount - 1 ? keywordPositions[i + 1].index : text.length;
      let block = text.slice(start, end).trim();
      
      if (block.length > 50 && /[א-ת]/.test(block)) {
        questions.push({
          number: i + 1,
          text: block
        });
      }
    }
    return questions;
  }

  // Fallback: split text into equal parts based on expectedCount
  const partLength = Math.floor(text.length / expectedCount);
  const questions: Array<{ number: number; text: string }> = [];
  
  for (let i = 0; i < expectedCount; i++) {
    const start = i * partLength;
    const end = i === expectedCount - 1 ? text.length : (i + 1) * partLength;
    let block = text.slice(start, end).trim();
    
    // Adjust to start at a newline for cleaner splits
    if (i > 0) {
      const newlineIndex = block.indexOf('\n');
      if (newlineIndex !== -1 && newlineIndex < 100) {
        block = block.slice(newlineIndex + 1).trim();
      }
    }
    
    if (block.length > 50 && /[א-ת]/.test(block)) {
      questions.push({
        number: i + 1,
        text: block
      });
    }
  }
  
  return questions;
}

async function getDocumentBySession(sessionId: string, type: string) {
  const db = await getDatabase();
  if ('query' in db) {
    // PostgreSQL
    const result = await db.query(
      'SELECT * FROM documents WHERE session_id = $1 AND type = $2 ORDER BY created_at DESC LIMIT 1',
      [sessionId, type]
    );
    return result.rows[0] || null;
  } else {
    // SQLite
    const doc = db.prepare(
      'SELECT * FROM documents WHERE session_id = ? AND type = ? ORDER BY created_at DESC LIMIT 1'
    ).get(sessionId, type);
    return doc || null;
  }
}

async function deleteQuestionsBySession(sessionId: string) {
  const db = await getDatabase();
  if ('query' in db) {
    // PostgreSQL
    await db.query('DELETE FROM questions WHERE session_id = $1', [sessionId]);
  } else {
    // SQLite
    db.prepare('DELETE FROM questions WHERE session_id = ?').run(sessionId);
  }
}

async function refreshSessionData(sessionId: string) {
  // This is a placeholder - session data will be refreshed on next API call
  // The frontend will call the session endpoint to get updated data
}

// Helper function to generate answer with chunks (now returns suggestions, not final answers)
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
        
Règles IMPORTANTES :
- Tu es un assistant d'étude, PAS quelqu'un qui complète le devoir
- NE rédige PAS de réponse finale prête à soumettre
- Aide l'étudiant à comprendre et préparer son travail
- Utilise uniquement les sources fournies
- Ne invente PAS de règles, pages, articles ou faits
- Donne des suggestions, structure et conseils
- L'étudiant DOIT rédiger la réponse finale manuellement

Pour chaque question, retourne un JSON avec :
{
  "cleanedHebrew": "question réécrite proprement en hébreu (même sens, formatage propre)",
  "frenchUnderstanding": "explication en français de ce que la question demande",
  "keywordsHebrew": ["mots-clés hébreu"],
  "keywordsFrench": ["mots-clés français"],
  "relevantSources": [
    {
      "page": numéro ou null,
      "excerpt": "extrait utile",
      "reason": "pourquoi cette source est utile"
    }
  ],
  "suggestions": [
    "Identifier le fait fiscal principal",
    "Chercher si l'événement crée un revenu imposable",
    "Vérifier le taux applicable",
    "Vérifier si une exception existe",
    "Conclure en appliquant la règle au cas"
  ],
  "recommendedPlan15Lines": [
    "1. Présenter les faits",
    "2. Identifier la règle fiscale",
    "3. Citer la source pertinente",
    "4. Appliquer la règle au cas",
    "5. Conclure"
  ],
  "pointsToVerify": [
    "vérifier la page source",
    "ne pas inventer d'article",
    "reformuler avec ses propres mots"
  ],
  "warnings": []
}

Si aucune source suffisante n'est trouvée, retourne :
{
  "cleanedHebrew": "...",
  "frenchUnderstanding": "...",
  "relevantSources": [],
  "suggestions": ["Aucune source suffisante trouvée"],
  "recommendedPlan15Lines": [],
  "pointsToVerify": ["Vérifier si le sujet est couvert dans le document"],
  "warnings": ["Aucune source suffisante trouvée dans le document"]
}`
      },
      {
        role: 'user',
        content: `Question originale: ${question}\n\nSources du document:\n${context}\n\nGénère des suggestions pour aider l'étudiant à préparer sa réponse. Retourne uniquement du JSON valide.`
      }
    ],
    temperature: 0.7,
    response_format: { type: "json_object" }
  });

  const content = response.choices[0].message.content || '{}';
  
  try {
    const parsed = JSON.parse(content);
    return {
      hebrew: parsed.cleanedHebrew || question,
      french: parsed.frenchUnderstanding || '',
      reasoning: JSON.stringify({
        keywordsHebrew: parsed.keywordsHebrew || [],
        keywordsFrench: parsed.keywordsFrench || [],
        suggestions: parsed.suggestions || [],
        recommendedPlan15Lines: parsed.recommendedPlan15Lines || [],
        pointsToVerify: parsed.pointsToVerify || [],
        warnings: parsed.warnings || []
      }),
      sources: (parsed.relevantSources || []).map((s: any, i: number) => ({
        chunkIndex: relevantChunks[i]?.id,
        page: s.page || relevantChunks[i]?.page || null,
        excerpt: s.excerpt || relevantChunks[i]?.text?.substring(0, 200) || '',
        reason: s.reason || 'Source pertinente',
        documentName: 'Document de lois fiscales'
      }))
    };
  } catch (e) {
    // Fallback if JSON parsing fails
    return {
      hebrew: question,
      french: '',
      reasoning: JSON.stringify({
        suggestions: ['Erreur lors de l\'analyse'],
        warnings: ['Veuillez réessayer']
      }),
      sources: []
    };
  }
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

// Helper function to detect student answers from completed document
function detectStudentAnswers(text: string): Array<{ questionId: string; studentAnswer: string; lineCount: number }> {
  const lines = text.split('\n');
  const answers: Array<{ questionId: string; studentAnswer: string; lineCount: number }> = [];
  let currentNumber = 1;
  let currentText = '';

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect question numbers in completed document
    if (trimmed.match(/^שאלה\s+\d+/) || 
        trimmed.match(/^Question\s+\d+/i) ||
        trimmed.match(/^\d+\./)) {
      if (currentText) {
        answers.push({
          questionId: currentNumber.toString(),
          studentAnswer: currentText.trim(),
          lineCount: currentText.split('\n').length
        });
        currentNumber++;
      }
      currentText = '';
    } else if (trimmed.length > 0) {
      currentText += (currentText ? '\n' : '') + trimmed;
    }
  }

  if (currentText) {
    answers.push({
      questionId: currentNumber.toString(),
      studentAnswer: currentText.trim(),
      lineCount: currentText.split('\n').length
    });
  }

  return answers;
}

// Helper function to correct student answer with chunks
async function correctAnswerWithChunks(question: string, hebrewAnswer: string, chunks: any[], openai: any) {
  // Select relevant chunks
  const relevantChunks = chunks.slice(0, 5);
  const context = relevantChunks.map(c => c.text).join('\n\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Tu es un assistant de vérification académique en droit fiscal.
        
Vérifie la réponse de l'étudiant en utilisant uniquement les sources fournies.
Ne prétends pas que la réponse est garantie 100% correcte.
Utilise la phrase : "Validation basée uniquement sur les sources fournises."

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
- status (Très solide, À améliorer, Source insuffisante, Réponse trop longue, Non vérifiable, Incomplète)
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
        content: `Question: ${question}\n\nRéponse hébreu: ${hebrewAnswer}\n\nDocument de référence:\n${context}\n\nVérifie cette réponse et retourne le JSON.`
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
