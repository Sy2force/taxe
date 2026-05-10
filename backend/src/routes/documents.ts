import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { Document, HomeworkQuestion } from '../types';
import { extractTextFromFile, saveDocument, getAllDocuments, getDocument, deleteDocument, countLines, searchInDocuments } from '../services/documentService';
import { analyzeQuestionLocally, correctAnswerLocally } from '../services/localAnalysisService';
import { analyzeQuestionWithAI, correctAnswerWithAI, improveStyle, optimizeAnswer, isOpenAIEnabled } from '../services/aiService';
import { ETHICAL_WARNING, ANTI_FINAL_ANSWER_RESPONSE } from '../prompts';

const router = Router();

// Configure Multer with file filter to accept PDF, DOCX, DOC, and TXT
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/msword', // Old .doc files
      'application/octet-stream', // Fallback for .doc files
    ];
    
    // Also check file extension for .doc
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
    if (!req.file) {
      console.log("UPLOAD_DEBUG_START - Pas de fichier reçu");
      return res.status(400).json({ error: 'Format non supporté. Utilisez PDF, DOCX, DOC ou TXT.' });
    }

    const fileType = path.extname(req.file.originalname).toLowerCase();
    
    console.log("UPLOAD_DEBUG_START", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      extension: fileType
    });
    
    // Validate supported file types
    const supportedTypes = ['.pdf', '.docx', '.doc', '.txt'];
    if (!supportedTypes.includes(fileType)) {
      console.log("UPLOAD_DEBUG_ERROR - Format non supporté", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        extension: fileType
      });
      return res.status(400).json({ 
        error: `Type de fichier non supporté : ${fileType}. Veuillez télécharger des fichiers PDF, DOCX, DOC ou TXT.` 
      });
    }

    const { text, pages } = await extractTextFromFile(req.file);

    console.log("UPLOAD_DEBUG_SUCCESS", {
      originalname: req.file.originalname,
      extractedLength: text.length,
      estimatedPages: pages || 'N/A'
    });

    const document: Document = {
      id: uuidv4(),
      name: req.file!.originalname,
      type: fileType.slice(1) as 'pdf' | 'docx' | 'doc' | 'txt',
      pages: fileType === '.pdf' ? pages : undefined,
      content: text,
      uploadedAt: new Date().toISOString(),
    };

    saveDocument(document);
    res.json(document);
  } catch (error) {
    console.error("UPLOAD_DEBUG_ERROR", {
      originalname: req.file?.originalname,
      mimetype: req.file?.mimetype,
      extension: req.file ? path.extname(req.file.originalname).toLowerCase() : 'unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    const errorMessage = error instanceof Error ? error.message : 'Impossible de lire ce document. Vérifiez que le fichier n\'est pas corrompu et réessayez.';
    res.status(500).json({ error: errorMessage });
  }
});

router.get('/documents', (req: Request, res: Response) => {
  const documents = getAllDocuments();
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

export default router;
