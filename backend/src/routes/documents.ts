import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { Document, HomeworkQuestion } from '../types.js';
import { extractTextFromFile, saveDocument, getAllDocuments, getDocument, deleteDocument, countLines, searchInDocuments, clearAllDocuments } from '../services/documentService.js';
import { analyzeQuestionLocally, correctAnswerLocally } from '../services/localAnalysisService.js';
import { analyzeQuestionWithAI, correctAnswerWithAI, improveStyle, optimizeAnswer, isOpenAIEnabled, getOpenAIClient } from '../services/aiService.js';
import { buildChunks, storeLawsChunks, getLawsChunks, getLawsDocumentName, getLawsTotalPages, clearLawsChunks, generateAnswerWithRAG, retrieveTopChunks, extractQueryTerms } from '../services/ragService.js';
import { ETHICAL_WARNING, ANTI_FINAL_ANSWER_RESPONSE } from '../prompts.js';
import { saveDocumentToDb, getAllDocumentsFromDb, clearAllDocumentsFromDb, saveGeneratedAnswer, getAllGeneratedAnswersFromDb, saveExerciseDocumentToDb, getExerciseDocumentFromDb, saveLawsDocumentToDb, getLawsDocumentFromDb } from '../services/database.js';

const router = Router();

// Configure Multer — use /tmp on Render for writable storage
const uploadDir = process.env.NODE_ENV === 'production' ? '/tmp/uploads' : path.join(process.cwd(), 'uploads');
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/msword', // Old .doc files
      'application/octet-stream', // Fallback for .doc files
    ];
    
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(extension)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Format non supporté. Utilisez PDF, DOCX, DOC ou TXT.' });

    const fileType = path.extname(req.file.originalname).toLowerCase();
    const supportedTypes = ['.pdf', '.docx', '.doc', '.txt'];
    if (!supportedTypes.includes(fileType)) {
      return res.status(400).json({ error: `Type de fichier non supporté : ${fileType}. Utilisez PDF, DOCX, DOC ou TXT.` });
    }

    const { text, pages } = await extractTextFromFile(req.file);

    const document: Document = {
      id: uuidv4(),
      name: req.file!.originalname,
      type: fileType.slice(1) as 'pdf' | 'docx' | 'doc' | 'txt',
      pages: fileType === '.pdf' ? pages : undefined,
      content: text,
      uploadedAt: new Date().toISOString(),
    };

    saveDocument(document);
    await saveDocumentToDb(document);
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Impossible de lire ce document.' });
  }
});

router.get('/documents', async (req: Request, res: Response) => {
  const documents = getAllDocuments();
  const dbDocuments = await getAllDocumentsFromDb();
  res.json(documents);
});

router.get('/documents/:id', (req: Request, res: Response) => {
  const document = getDocument(req.params.id);
  if (!document) {
    return res.status(404).json({ error: 'Document non trouvé' });
  }
  res.json(document);
});

router.delete('/documents/:id', (req: Request, res: Response) => {
  const deleted = deleteDocument(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Document non trouvé' });
  }
  res.json({ success: true });
});

router.post('/search', (req: Request, res: Response) => {
  const { query } = req.body;
  const results = searchInDocuments(query);
  res.json(results);
});

router.post('/analyze-question', async (req: Request, res: Response) => {
  const { question, useAI } = req.body;
  
  if (useAI && isOpenAIEnabled()) {
    try {
      const documents = getAllDocuments();
      const context = documents.map(d => d.content).join('\n\n');
      const analysis = await analyzeQuestionWithAI(question, context);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: 'Échec de l\'analyse IA' });
    }
  } else {
    const analysis = analyzeQuestionLocally(question);
    res.json(analysis);
  }
});

router.post('/correct-answer', async (req: Request, res: Response) => {
  const { answer, question, useAI } = req.body;
  
  if (useAI && isOpenAIEnabled()) {
    try {
      const documents = getAllDocuments();
      const context = documents.map(d => d.content).join('\n\n');
      const correction = await correctAnswerWithAI(answer, question, context);
      res.json(correction);
    } catch (error) {
      res.status(500).json({ error: 'Échec de la correction IA' });
    }
  } else {
    const correction = correctAnswerLocally(answer, question);
    res.json(correction);
  }
});

router.post('/improve-style', async (req: Request, res: Response) => {
  const { text } = req.body;
  
  if (isOpenAIEnabled()) {
    try {
      const result = await improveStyle(text);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Échec de l'amélioration du style" });
    }
  } else {
    res.json({
      correctedText: text,
      warnings: ['Activez l\'API OpenAI pour une correction linguistique avancée']
    });
  }
});

router.post('/optimize-answer', async (req: Request, res: Response) => {
  const { answer, question } = req.body;
  
  if (isOpenAIEnabled()) {
    try {
      const advice = await optimizeAnswer(answer, question);
      res.json({ advice });
    } catch (error) {
      res.status(500).json({ error: "Échec de l'optimisation" });
    }
  } else {
    res.json({
      advice: 'Utilisez le mode IA pour des conseils d\'optimisation personnalisés'
    });
  }
});

router.post('/count-lines', (req: Request, res: Response) => {
  const { text } = req.body;
  const count = countLines(text);
  res.json(count);
});

router.get('/ethical-warning', (req: Request, res: Response) => {
  res.json({ warning: ETHICAL_WARNING });
});

// Homework questions management
const homeworkQuestions: Map<number, HomeworkQuestion> = new Map();

// New simplified architecture: exercise document, laws document, generated answers
let exerciseDocument: Document | null = null;
let lawsDocument: Document | null = null;
const generatedAnswers: Map<number, { answer: string; sources: object[] }> = new Map();

// Upload exercise file (extracts questions)
router.post('/upload-exercise', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni.' });
    const fileType = path.extname(req.file.originalname).toLowerCase();
    const supported = ['.pdf', '.docx', '.doc', '.txt'];
    if (!supported.includes(fileType)) {
      return res.status(400).json({ error: `Format non supporté : ${fileType}. Utilisez PDF, DOCX, DOC ou TXT.` });
    }
    const { text, pages } = await extractTextFromFile(req.file);
    const exerciseDoc = {
      id: uuidv4(),
      name: req.file.originalname,
      type: fileType.slice(1) as 'pdf' | 'docx' | 'doc' | 'txt',
      pages,
      content: text,
      uploadedAt: new Date().toISOString(),
    };
    exerciseDocument = exerciseDoc;
    await saveExerciseDocumentToDb(exerciseDoc);
    res.json({ ...exerciseDoc, chars: text.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de l\'import de l\'exercice' });
  }
});

// Upload laws document (243 pages) — builds RAG chunks for accurate retrieval
router.post('/upload-laws', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni.' });
    const fileType = path.extname(req.file.originalname).toLowerCase();
    const supported = ['.pdf', '.docx', '.doc', '.txt'];
    if (!supported.includes(fileType)) {
      return res.status(400).json({ error: `Format non supporté : ${fileType}. Utilisez PDF, DOCX, DOC ou TXT.` });
    }
    const { text, pages } = await extractTextFromFile(req.file);
    if (!text || text.trim().length < 100) {
      return res.status(400).json({ error: 'Ce PDF semble être scanné ou vide. Aucun texte exploitable trouvé. Utilisez un PDF avec texte sélectionnable.' });
    }
    const doc: Document = {
      id: uuidv4(),
      name: req.file.originalname,
      type: fileType.slice(1) as 'pdf' | 'docx' | 'doc' | 'txt',
      pages,
      content: text,
      uploadedAt: new Date().toISOString(),
    };
    // Clear old data, store new document
    clearAllDocuments();
    saveDocument(doc);
    await saveDocumentToDb(doc);
    await saveLawsDocumentToDb(doc);
    lawsDocument = doc;
    generatedAnswers.clear();
    // Build RAG chunks for accurate retrieval
    const chunks = buildChunks(text, pages);
    storeLawsChunks(chunks, req.file.originalname, pages);
    res.json({ ...doc, chars: text.length, chunks: chunks.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de l\'import du document de lois' });
  }
});

// Generate answer — RAG pipeline: chunk retrieval → GPT with strict source-only prompt
router.post('/generate-answer', async (req: Request, res: Response) => {
  const { questionId, questionText } = req.body;
  if (!questionText) return res.status(400).json({ error: 'questionText est requis' });

  const chunks = getLawsChunks();
  if (chunks.length === 0) {
    return res.json({
      questionId,
      answer: '',
      sources: [],
      status: 'no_source',
      message: 'Aucun document de lois importé. Importez d\'abord le document de 243 pages sur la page Lois fiscales.'
    });
  }

  try {
    const ragResult = await generateAnswerWithRAG(
      questionText,
      chunks,
      getLawsTotalPages(),
      getOpenAIClient(),
    );

    if (!ragResult.hasSource) {
      return res.json({
        questionId,
        answer: '',
        sources: [],
        status: 'no_source',
        message: ragResult.noSourceMessage,
      });
    }

    const sources = ragResult.chunks.slice(0, 5).map(c => ({
      extract: c.text.substring(0, 300),
      page: c.page || undefined,
      documentName: getLawsDocumentName(),
      relevanceScore: Math.round(c.score * 100) / 100,
      matchedTerms: c.matchedTerms.slice(0, 6),
    }));

    const result = {
      questionId,
      answer: ragResult.answer,
      understanding: ragResult.understanding,
      reasoning: ragResult.reasoning,
      keywordsHe: ragResult.keywordsHe,
      keywordsFr: ragResult.keywordsFr,
      sources,
      status: 'done',
    };
    generatedAnswers.set(questionId, result);
    await saveGeneratedAnswer({
      questionId,
      question: questionText,
      answer: ragResult.answer,
      sources,
      createdAt: new Date().toISOString()
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la génération de la réponse' });
  }
});

router.post('/homework-questions', (req: Request, res: Response) => {
  try {
    const { id, questionText } = req.body;
    const question: HomeworkQuestion = {
      id: id || Date.now(),
      questionText: questionText || '',
      sources: [],
      notes: '',
      draftAnswer: '',
      correctedAnswer: '',
      checklist: [],
      status: 'not_started',
    };
    homeworkQuestions.set(question.id, question);
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: "Échec de la création de la question" });
  }
});

router.get('/homework-questions', (req: Request, res: Response) => {
  res.json(Array.from(homeworkQuestions.values()));
});

router.get('/homework-questions/:id', (req: Request, res: Response) => {
  const question = homeworkQuestions.get(parseInt(req.params.id));
  if (!question) {
    return res.status(404).json({ error: 'Question non trouvée' });
  }
  res.json(question);
});

router.put('/homework-questions/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = homeworkQuestions.get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Question non trouvée' });
    }
    const updated: HomeworkQuestion = {
      ...existing,
      ...req.body,
      id,
    };
    homeworkQuestions.set(id, updated);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Échec de la mise à jour de la question" });
  }
});

router.delete('/homework-questions/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (!homeworkQuestions.has(id)) {
    return res.status(404).json({ error: 'Question non trouvée' });
  }
  homeworkQuestions.delete(id);
  res.json({ success: true });
});

// Reset all data - for "Nouvelle session"
router.post('/reset-all', (req: Request, res: Response) => {
  try {
    clearAllDocuments();
    homeworkQuestions.clear();
    clearLawsChunks();
    res.json({ success: true, message: 'Toutes les données ont été réinitialisées' });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation des données' });
  }
});

// Reset session (new simplified endpoint)
router.post('/reset-session', (req: Request, res: Response) => {
  try {
    clearAllDocuments();
    homeworkQuestions.clear();
    exerciseDocument = null;
    lawsDocument = null;
    generatedAnswers.clear();
    clearLawsChunks();
    res.json({ success: true, message: 'Session réinitialisée' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
});

// Anti-final-answer filter
router.post('/check-final-answer-request', (req: Request, res: Response) => {
  const { text } = req.body;
  const lowerText = text.toLowerCase();
  
  const forbiddenPhrases = [
    'fais-moi la réponse',
    'donne la réponse finale',
    'écris la réponse à ma place',
    'je veux copier-coller',
    'réponds directement à la question',
    'fais tout le devoir',
    'rédige le devoir',
    'donne-moi la réponse complète',
    'écris la réponse finale',
  ];
  
  const isForbidden = forbiddenPhrases.some(phrase => lowerText.includes(phrase));
  
  if (isForbidden) {
    res.json({ 
      isFinalAnswerRequest: true, 
      response: ANTI_FINAL_ANSWER_RESPONSE 
    });
  } else {
    res.json({ isFinalAnswerRequest: false });
  }
});

// Question-answer comparison
router.post('/compare-question-answer', (req: Request, res: Response) => {
  const { question, answer } = req.body;
  
  const comparison = [
    { subQuestion: 'Événement fiscal', present: checkElement(answer, ['événement', 'taxation', 'imposable']), comment: '', toAdd: '' },
    { subQuestion: 'Montant imposable', present: checkElement(answer, ['montant', '₪', '$', '%']), comment: '', toAdd: '' },
    { subQuestion: 'Source de revenu', present: checkElement(answer, ['source', 'revenu', 'מקור']), comment: '', toAdd: '' },
    { subQuestion: 'Taux d\'imposition', present: checkElement(answer, ['taux', '%', 'שיעור']), comment: '', toAdd: '' },
    { subQuestion: 'Moment d\'imposition', present: checkElement(answer, ['moment', 'date', 'מועד']), comment: '', toAdd: '' },
    { subQuestion: 'Justification', present: checkElement(answer, ['car', 'parce que', 'donc', 'לכן']), comment: '', toAdd: '' },
    { subQuestion: 'Conclusion', present: checkElement(answer, ['conclusion', 'donc', 'par conséquent']), comment: '', toAdd: '' },
  ];
  
  res.json({ comparison });
});

function checkElement(answer: string, keywords: string[]): boolean {
  const lowerAnswer = answer.toLowerCase();
  return keywords.some(keyword => lowerAnswer.includes(keyword.toLowerCase()));
}

// 15-line reduction tool
router.post('/reduce-lines', (req: Request, res: Response) => {
  const { text } = req.body;
  const lines = text.split('\n').filter((line: string) => line.trim());
  const lineCount = countLines(text);
  
  if (!lineCount.exceedsLimit) {
    return res.json({ 
      originalLines: lines.length,
      reducedText: text,
      suggestions: ['La réponse est déjà sous la limite de 15 lignes']
    });
  }
  
  const suggestions: string[] = [];
  const reducedLines = lines.filter((line: string) => {
    // Remove very short lines that might be filler
    if (line.trim().length < 5) {
      suggestions.push('Ligne très courte supprimée');
      return false;
    }
    // Remove duplicate lines
    if (lines.filter((l: string) => l.trim() === line.trim()).length > 1) {
      suggestions.push('Ligne en double supprimée');
      return false;
    }
    return true;
  });
  
  const reducedText = reducedLines.join('\n');
  
  res.json({
    originalLines: lines.length,
    reducedLines: reducedLines.length,
    reducedText,
    suggestions,
  });
});

// Language-only correction
router.post('/correct-language-only', async (req: Request, res: Response) => {
  const { text } = req.body;
  
  try {
    if (isOpenAIEnabled()) {
      const correction = await improveStyle(text);
      res.json({ correctedText: correction });
    } else {
      // Basic local language correction
      let corrected = text;
      corrected = corrected.replace(/\.+/g, '.');
      corrected = corrected.replace(/,\s*,/g, ',');
      corrected = corrected.replace(/\s+/g, ' ');
      res.json({ correctedText: corrected });
    }
  } catch (error) {
    res.status(500).json({ error: "Échec de la correction linguistique" });
  }
});

// Calculation verification
router.post('/verify-calculations', (req: Request, res: Response) => {
  const { text } = req.body;
  const calculations: { expression: string; result: number }[] = [];
  
  // Extract percentage calculations
  const percentageRegex = /(\d+)\s*%\s*(?:de|of)\s*(\d+)/gi;
  let match;
  while ((match = percentageRegex.exec(text)) !== null) {
    const value = parseFloat(match[1]);
    const base = parseFloat(match[2]);
    const result = (value / 100) * base;
    calculations.push({ expression: `${value}% de ${base}`, result });
  }
  
  // Extract multiplication
  const multRegex = /(\d+(?:,\d+)?)\s*(?:x|×|\*)\s*(\d+(?:,\d+)?)/gi;
  while ((match = multRegex.exec(text)) !== null) {
    const a = parseFloat(match[1].replace(',', '.'));
    const b = parseFloat(match[2].replace(',', '.'));
    const result = a * b;
    calculations.push({ expression: `${a} × ${b}`, result });
  }
  
  // Extract subtraction (price difference)
  const subRegex = /(\d+(?:,\d+)?)\s*[-–]\s*(\d+(?:,\d+)?)/gi;
  while ((match = subRegex.exec(text)) !== null) {
    const a = parseFloat(match[1].replace(',', '.'));
    const b = parseFloat(match[2].replace(',', '.'));
    const result = a - b;
    calculations.push({ expression: `${a} - ${b}`, result });
  }
  
  res.json({
    calculations,
    disclaimer: 'Ces calculs sont basés sur les expressions trouvées dans le texte. Vérifiez toujours avec le cours.'
  });
});

// Guided answer generation
router.post('/generate-guided-answer', async (req: Request, res: Response) => {
  const { question, useAI = false } = req.body;
  
  try {
    const documents = getAllDocuments();
    
    // Check if document exists
    if (documents.length === 0) {
      return res.json({
        success: false,
        message: 'Aucun document principal importé. Importez d\'abord le document de 243 pages pour générer une réponse guidée.',
        guidedAnswer: null
      });
    }
    
    const analysis = useAI && isOpenAIEnabled() 
      ? await analyzeQuestionWithAI(question, documents.map(d => d.content).join('\n\n'))
      : analyzeQuestionLocally(question);
    
    // Check if we have sufficient sources from the document
    if (analysis.usefulPassages.length === 0) {
      return res.json({
        success: false,
        message: 'Aucune source pertinente n\'a été trouvée dans le document principal importé. Je ne peux pas générer une réponse fiable sans extrait du document. Essayez avec d\'autres mots-clés ou vérifiez que le bon document a été importé.',
        guidedAnswer: null
      });
    }
    
    // Generate guided answer structure based ONLY on found sources
    const guidedAnswer = {
      title: 'Réponse guidée à personnaliser',
      sections: [
        {
          title: '1. Introduction',
          content: `Dans cette question, il faut déterminer : ${analysis.whatQuestionAsks}`
        },
        {
          title: '2. Faits pertinents',
          content: analysis.factsToIdentify.map(fact => `- ${fact}`).join('\n')
        },
        {
          title: '3. Règle applicable issue du document',
          content: analysis.possibleRules.map(rule => `- ${rule}`).join('\n')
        },
        {
          title: '4. Sources utilisées du document principal',
          content: analysis.usefulPassages.slice(0, 3).map((passage, idx) => 
            `- Extrait ${idx + 1} (page ${passage.page || 'non détectée'}): "${passage.extract.substring(0, 100)}..."`
          ).join('\n')
        },
        {
          title: '5. Application aux faits',
          content: 'Appliquez la règle identifiée aux faits de la question en suivant la structure suggérée.'
        },
        {
          title: '6. Calcul éventuel',
          content: analysis.importantAmounts.length > 0 
            ? `Montants à calculer : ${analysis.importantAmounts.join(', ')}`
            : 'Aucun calcul spécifique identifié dans la question.'
        },
        {
          title: '7. Conclusion possible',
          content: 'Concluez en précisant : l\'événement fiscal, le contribuable, le montant, le taux, et le moment d\'imposition.'
        },
        {
          title: '8. Points à vérifier',
          content: analysis.checklist.map(item => `- ${item}`).join('\n')
        },
        {
          title: '9. Mention académique',
          content: 'Cette réponse est basée UNIQUEMENT sur les extraits trouvés dans le document principal importé. Elle doit être vérifiée et reformulée avec vos propres mots avant soumission.'
        }
      ],
      metadata: {
        subject: analysis.subject,
        detectedConcepts: analysis.keywordsToSearch.slice(0, 5),
        sourceCount: analysis.usefulPassages.length,
        documentName: documents[0].name
      }
    };
    
    res.json({
      success: true,
      guidedAnswer
    });
  } catch (error) {
    console.error('Guided answer generation error:', error);
    res.status(500).json({ error: 'Erreur lors de la génération de la réponse guidée' });
  }
});

// Homework verification
router.post('/verify-homework', (req: Request, res: Response) => {
  const { questions } = req.body;
  
  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: 'Tableau de questions requis' });
  }
  
  const verification = questions.map((q: any) => {
    const hasAnswer = q.answer && q.answer.trim().length > 0;
    const hasSource = q.answer && (q.answer.includes('section') || q.answer.includes('סעיף') || q.answer.includes('page'));
    const hasRule = q.answer && (q.answer.includes('règle') || q.answer.includes('taux') || q.answer.includes('%'));
    const hasCalculation = /\d+/.test(q.answer || '');
    const hasConclusion = q.answer && (q.answer.includes('donc') || q.answer.includes('par conséquent') || q.answer.includes('conclusion'));
    
    const lineCount = countLines(q.answer || '');
    
    let status: 'ready' | 'needs_improvement' | 'incomplete' = 'incomplete';
    let score = 0;
    
    if (hasAnswer) score += 20;
    if (hasSource) score += 20;
    if (hasRule) score += 20;
    if (hasCalculation) score += 15;
    if (hasConclusion) score += 15;
    if (!lineCount.exceedsLimit) score += 10;
    
    if (score >= 80) status = 'ready';
    else if (score >= 50) status = 'needs_improvement';
    
    return {
      id: q.id,
      status,
      score,
      checks: {
        hasAnswer,
        hasSource,
        hasRule,
        hasCalculation,
        hasConclusion,
        withinLineLimit: !lineCount.exceedsLimit
      },
      issues: []
    };
  });
  
  const overallStatus = verification.every((v: any) => v.status === 'ready') 
    ? 'ready' 
    : verification.some((v: any) => v.status === 'incomplete') 
      ? 'incomplete' 
      : 'needs_improvement';
  
  res.json({
    overallStatus,
    verification,
    summary: {
      total: verification.length,
      ready: verification.filter((v: any) => v.status === 'ready').length,
      needsImprovement: verification.filter((v: any) => v.status === 'needs_improvement').length,
      incomplete: verification.filter((v: any) => v.status === 'incomplete').length
    }
  });
});

// ─── FINAL DOCUMENT CHECK ──────────────────────────────────────────────────

// Upload final document (student's completed homework)
router.post('/upload-final-document', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni.' });
    const fileType = path.extname(req.file.originalname).toLowerCase();
    const supported = ['.pdf', '.docx', '.doc', '.txt'];
    if (!supported.includes(fileType)) {
      return res.status(400).json({ error: `Format non supporté : ${fileType}. Utilisez PDF, DOCX, DOC ou TXT.` });
    }
    const { text } = await extractTextFromFile(req.file);
    res.json({ name: req.file.originalname, content: text, chars: text.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de l\'import du document final' });
  }
});

// Final check: compare student answers against laws document
router.post('/final-check', async (req: Request, res: Response) => {
  const { pairs } = req.body as {
    pairs: { questionId: number; question: string; answer: string }[]
  };

  const docs = getAllDocuments();
  if (docs.length === 0) {
    return res.status(400).json({
      error: 'Importez d\'abord le document de lois fiscales avant de vérifier le document final.'
    });
  }
  if (!pairs || !Array.isArray(pairs) || pairs.length === 0) {
    return res.status(400).json({ error: 'Aucune paire question/réponse fournie.' });
  }

  const lawsChunks = getLawsChunks();
  const results = [];
  for (const pair of pairs) {
    // Use RAG for accurate source retrieval
    const topChunks = lawsChunks.length > 0
      ? retrieveTopChunks(lawsChunks, pair.question, 6)
      : [];
    const sources = topChunks.slice(0, 5).map(c => ({
      extract: c.text.substring(0, 300),
      page: c.page,
      documentName: docs[0].name,
      relevanceScore: c.score,
    }));

    const hasSource = sources.length > 0;
    const answer = pair.answer || '';
    const answerLower = answer.toLowerCase();
    const lines = answer.split('\n').filter((l: string) => l.trim()).length;

    // Scoring
    const hasRule = /règle|taux|section|סעיף|loi|article|%/.test(answerLower);
    const hasConclusion = /donc|conclusion|par conséquent|ainsi|לכן|לסיכום/.test(answerLower);
    const hasCalculation = /\d+[\s*x×]\s*\d+|\d+\s*%|\d+\s*[+\-=]/.test(answer);
    const hasFacts = answer.length > 80;
    const questionTerms = extractQueryTerms(pair.question);
    const isOnTopic = questionTerms.some((kw: string) => answerLower.includes(kw.toLowerCase()));
    const tooLong = lines > 15;

    let score = 0;
    // compréhension de la question (15)
    score += isOnTopic ? 15 : 5;
    // faits importants (15)
    score += hasFacts ? 15 : 5;
    // règle fiscale (20)
    score += hasRule ? 20 : 0;
    // source (15)
    score += hasSource ? 15 : 0;
    // application (15)
    score += answer.length > 150 ? 15 : 8;
    // calcul (10)
    score += hasCalculation ? 10 : 5;
    // conclusion (10)
    score += hasConclusion ? 10 : 0;

    // Pénalités
    if (!hasSource) score = Math.min(score, 50);
    if (!hasConclusion) score = Math.max(0, score - 10);
    if (!isOnTopic) score = Math.min(score, 40);

    // Build corrections list
    const corrections: string[] = [];
    if (!isOnTopic) corrections.push('La réponse semble hors sujet par rapport à la question. Vérifiez que vous répondez bien à ce qui est demandé.');
    if (!hasSource) corrections.push('Aucune source n\'a été trouvée dans le document de lois pour valider cette réponse.');
    if (!hasRule) corrections.push('La règle fiscale applicable n\'est pas clairement mentionnée. Citez la section ou l\'article pertinent.');
    if (!hasFacts) corrections.push('La réponse est trop courte. Développez les faits importants et leur application.');
    if (!hasConclusion) corrections.push('Ajoutez une conclusion claire précisant l\'événement fiscal, le montant et le taux.');
    if (tooLong) corrections.push(`La réponse dépasse 15 lignes (${lines} lignes). Condensez pour respecter la contrainte.`);
    if (!hasCalculation) corrections.push('Un calcul chiffré semble nécessaire pour cette question. Vérifiez si des montants sont à calculer.');

    // Proposed improvement
    let improved = '';
    if (isOpenAIEnabled() && sources.length > 0) {
      try {
        const ctx = sources.map(s => s.extract).join('\n\n');
        const aiResult = await correctAnswerWithAI(answer, pair.question, ctx);
        improved = aiResult.languageCorrection || '';
      } catch {
        improved = '';
      }
    }
    if (!improved) {
      improved = corrections.length === 0
        ? answer
        : `${answer}\n\n[Corrections suggérées]\n${corrections.map(c => `- ${c}`).join('\n')}`;
    }

    let status: 'ready' | 'needs_improvement' | 'no_source' | 'incomplete';
    if (!hasSource) status = 'no_source';
    else if (score >= 80 && corrections.length === 0) status = 'ready';
    else if (score >= 50) status = 'needs_improvement';
    else status = 'incomplete';

    results.push({
      questionId: pair.questionId,
      question: pair.question,
      answer: pair.answer,
      score,
      status,
      sources,
      corrections,
      improved,
      details: { hasSource, hasRule, hasConclusion, hasCalculation, hasFacts, isOnTopic, lines, tooLong },
    });
  }

  const scores = results.map(r => r.score);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const ready = results.filter(r => r.status === 'ready').length;
  const noSource = results.filter(r => r.status === 'no_source').length;

  let globalStatus = 'Prêt à relire';
  if (noSource > 0) globalStatus = 'Sources manquantes';
  else if (ready < results.length) globalStatus = 'À corriger';
  if (results.some(r => r.status === 'incomplete')) globalStatus = 'Incomplet';

  res.json({
    globalStatus,
    avgScore,
    total: results.length,
    ready,
    needsImprovement: results.filter(r => r.status === 'needs_improvement').length,
    noSource,
    incomplete: results.filter(r => r.status === 'incomplete').length,
    results,
  });
});

// ─── Action IA sur une réponse existante (optimize / shorten / clarify / explain / validate / ask) ─────────
router.post('/answer-action', async (req: Request, res: Response) => {
  try {
    const {
      action,
      questionText,
      currentAnswer,
      sources,
      userQuestion,
    }: {
      action: 'optimize' | 'shorten' | 'clarify' | 'explain' | 'validate' | 'ask';
      questionText: string;
      currentAnswer: string;
      sources?: { extract: string; page?: number; documentName?: string }[];
      userQuestion?: string;
    } = req.body;

    if (!action || !questionText) {
      return res.status(400).json({ error: 'action et questionText requis' });
    }

    const sourcesBlock = (sources || []).slice(0, 5).map((s, i) =>
      `[Source ${i + 1}${s.page ? ` — page ${s.page}` : ''}]\n${s.extract}`
    ).join('\n\n---\n\n') || '(aucune source disponible)';

    const instructions: Record<string, string> = {
      optimize: 'Améliore cette réponse en gardant les sources et en restant strictement fidèle au document. Conserve la structure FAITS / RÈGLE / APPLICATION / SOURCE / CONCLUSION et les références.',
      shorten: 'Réduis cette réponse à 15 lignes maximum sans perdre la règle, l\'application et la conclusion. Préserve les références aux sources.',
      clarify: 'Réécris plus clairement, en français simple et précis, sans ajouter d\'information non sourcée.',
      explain: 'Explique le raisonnement plus simplement pour qu\'un étudiant comprenne, en gardant les références aux sources.',
      validate: 'Vérifie cette réponse uniquement avec les sources fournies. Indique en français : ce qui est CORRECT, ce qui est INCOMPLET, ce qui est À CORRIGER. Sois concis.',
      ask: `L'utilisateur pose une question sur cette réponse : "${userQuestion || ''}". Réponds en français, uniquement à partir de la question d'origine, de la réponse actuelle et des sources. Si l'information n'est pas dans les sources, réponds : "Je ne peux pas confirmer cela avec les sources actuellement trouvées."`,
    };

    const instruction = instructions[action];
    if (!instruction) return res.status(400).json({ error: `action inconnue : ${action}` });

    const client = getOpenAIClient();
    if (!client) {
      return res.json({
        success: false,
        result: '',
        warning: 'OpenAI non configuré — action IA indisponible.',
      });
    }

    const systemPrompt = `Tu es un assistant pédagogique expert en fiscalité des sociétés israélienne.
RÈGLES :
1. Utilise UNIQUEMENT la question, la réponse actuelle et les sources fournies.
2. N'invente JAMAIS de loi, page, article, taux ou montant.
3. Réponds en français clair, sans markdown.
4. Conserve l'hébreu original des termes techniques.
5. Si l'information demandée n'est pas dans les sources, dis-le explicitement.`;

    const userPrompt = `QUESTION D'ORIGINE :
${questionText}

RÉPONSE ACTUELLE :
${currentAnswer || '(pas encore de réponse)'}

SOURCES DISPONIBLES :
${sourcesBlock}

INSTRUCTION :
${instruction}`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 900,
    });

    const result = (response.choices[0].message.content || '').trim();
    const lineCount = result.split('\n').filter(l => l.trim()).length;

    res.json({ success: true, action, result, lineCount });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur action IA',
    });
  }
});

// Database routes - retrieve saved data
router.get('/db/saved-answers', async (req: Request, res: Response) => {
  try {
    const answers = await getAllGeneratedAnswersFromDb();
    res.json(answers);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de la récupération des réponses' });
  }
});

router.get('/db/exercise-document', async (req: Request, res: Response) => {
  try {
    const doc = await getExerciseDocumentFromDb();
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de la récupération du document d\'exercice' });
  }
});

router.get('/db/laws-document', async (req: Request, res: Response) => {
  try {
    const doc = await getLawsDocumentFromDb();
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de la récupération du document de lois' });
  }
});

router.get('/db/all-documents', async (req: Request, res: Response) => {
  try {
    const docs = await getAllDocumentsFromDb();
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de la récupération des documents' });
  }
});

export default router;

