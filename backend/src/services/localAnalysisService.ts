import { QuestionAnalysis, AnswerCorrection, SearchResult } from '../types';
import { searchInDocuments, countLines } from './documentService';
import { searchConcepts, type TaxConcept } from './taxKnowledgeBase';

const HEBREW_KEYWORDS = [
  // Fiscalité générale
  'מס', 'מס הכנסה', 'הכנסה חייבת', 'שיעור המס', 'מקור ההכנסה',
  'אירוע מס', 'מועד החיוב', 'תושב ישראל', 'תושב חוץ',
  
  // Sociétés
  'חברה', 'חבר בני אדם', 'מס חברות', 'סעיף 126', 'רווחים',
  'רווחי החברה', 'חלוקת רווחים', 'אישיות משפטית נפרדת',
  
  // Dividendes
  'דיבידנד', 'חלוקת דיבידנד', 'סעיף 125ב', 'בעל מניות',
  'בעל מניות מהותי', '25%', '30%',
  
  // Actions et plus-value
  'מניות', 'מכירת מניות', 'רווח הון', 'מחיר מקורי',
  'יום רכישה', 'תמורה', 'סעיף 88', 'מניות הטבה', 'סעיף 94',
  
  // Partenariat
  'שותפות', 'שותפים', 'סעיף 63', 'הכנסת השותפות',
  'גישה מעורבת', 'פסק דין שדות',
  
  // Prêts et retraits
  'הלוואה', 'הלוואות מוטבות', 'ריבית רעיונית',
  'סעיף 3(ט)', 'סעיף 3(ט1)', 'סעיף 3(י)',
  'משיכה מחברה', 'העמדת נכס', 'יתרת זכות', 'בעל שליטה',
  
  // Sociétés étrangères
  'חברה זרה', 'חברה נשלטת זרה', 'חברת משלח יד זרה',
  'הכנסה פסיבית', 'דיבידנד רעיוני', 'שליטה', 'תושבות'
];

export function analyzeQuestionLocally(question: string): QuestionAnalysis {
  const keywords = extractKeywords(question);
  const detectedConcepts = searchConcepts(question);
  const searchResults = searchInDocuments(keywords.join(' '));

  // Enhance keywords with concept-based keywords
  const enhancedKeywords = [...keywords];
  detectedConcepts.forEach(concept => {
    enhancedKeywords.push(...concept.motsClesFrancais);
    enhancedKeywords.push(...concept.motsClesHebreu);
  });

  return {
    whatQuestionAsks: identifyWhatQuestionAsks(question, detectedConcepts),
    factsToIdentify: extractFacts(question, detectedConcepts),
    keywordsToSearch: [...new Set(enhancedKeywords)], // Remove duplicates
    possibleRules: identifyPossibleRules(question, detectedConcepts),
    usefulPassages: searchResults,
    suggestedStructure: suggestStructure(question, detectedConcepts),
    errorsToAvoid: identifyErrorsToAvoid(question, detectedConcepts),
    checklist: generateChecklist(detectedConcepts),
    // Enhanced fields
    subject: identifySubject(question, detectedConcepts),
    personsConcerned: extractPersons(question, detectedConcepts),
    importantDates: extractDates(question),
    importantAmounts: extractAmounts(question),
    fiscalOperations: extractFiscalOperations(question, detectedConcepts),
    articlesOrNotions: identifyArticles(question, detectedConcepts),
    subQuestions: extractSubQuestions(question),
  };
}

export function correctAnswerLocally(answer: string, question: string): AnswerCorrection {
  const score = calculateScore(answer);
  
  return {
    positivePoints: identifyPositivePoints(answer),
    missingElements: identifyMissingElements(answer),
    legalTaxIssues: identifyLegalTaxIssues(answer),
    languageCorrection: correctLanguage(answer),
    improvementAdvice: generateImprovementAdvice(answer),
    finalChecklist: generateFinalChecklist(),
    score: score.category,
    scoreNumeric: score.numeric,
    respondsToQuestion: checkRespondsToQuestion(answer, question),
    allSubQuestionsAddressed: checkSubQuestions(answer, question),
    correctTaxpayerIdentified: checkTaxpayerIdentified(answer),
    fiscalEventIdentified: checkFiscalEvent(answer),
    taxableAmountIndicated: checkTaxableAmount(answer),
    incomeSourceIndicated: checkIncomeSource(answer),
    taxRateIndicated: checkTaxRate(answer),
    taxTimingIndicated: checkTaxTiming(answer),
    sourcesCited: checkSourcesCited(answer),
    conclusionClear: checkConclusion(answer),
    reasoningStructure: checkReasoningStructure(answer),
  };
}

function extractKeywords(question: string): string[] {
  const keywords: string[] = [];
  const lowerQuestion = question.toLowerCase();

  for (const keyword of HEBREW_KEYWORDS) {
    if (lowerQuestion.includes(keyword.toLowerCase()) || question.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  const frenchKeywords = ['dividende', 'impôt', 'société', 'actionnaire', 'bénéfice', 'taxe'];
  for (const keyword of frenchKeywords) {
    if (lowerQuestion.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  return keywords.length > 0 ? keywords : ['impôt', 'société'];
}

function identifyWhatQuestionAsks(question: string, concepts: TaxConcept[] = []): string {
  const lowerQuestion = question.toLowerCase();
  
  // Use concepts to provide more specific analysis
  if (concepts.length > 0) {
    const conceptNames = concepts.map(c => c.nomFrancais).join(', ');
    if (lowerQuestion.includes('calculer') || lowerQuestion.includes('montant')) {
      return `La question demande de calculer un montant ou un taux d'imposition concernant : ${conceptNames}`;
    }
    if (lowerQuestion.includes('expliquer') || lowerQuestion.includes('définir')) {
      return `La question demande d'expliquer ou définir le concept de : ${conceptNames}`;
    }
    if (lowerQuestion.includes('condition') || lowerQuestion.includes('critère')) {
      return `La question demande d'identifier les conditions ou critères pour : ${conceptNames}`;
    }
    return `La question demande d'analyser une situation fiscale concernant : ${conceptNames}`;
  }
  
  // Fallback to original logic
  if (lowerQuestion.includes('calculer') || lowerQuestion.includes('montant')) {
    return 'La question demande de calculer un montant ou un taux d\'imposition';
  }
  if (lowerQuestion.includes('expliquer') || lowerQuestion.includes('définir')) {
    return 'La question demande d\'expliquer ou définir un concept';
  }
  if (lowerQuestion.includes('condition') || lowerQuestion.includes('critère')) {
    return 'La question demande d\'identifier les conditions ou critères';
  }
  return 'La question demande d\'analyser une situation fiscale';
}

function extractFacts(question: string, concepts: TaxConcept[] = []): string[] {
  const facts: string[] = [];
  
  // Add concept-specific facts
  concepts.forEach(concept => {
    facts.push(...concept.elementsAVerifier);
  });
  
  // Original logic
  if (question.includes('מי') || question.includes('qui')) {
    facts.push('Identifier les personnes ou sociétés concernées');
  }
  if (question.includes('מתי') || question.includes('quand') || question.includes('date')) {
    facts.push('Identifier les dates importantes');
  }
  if (question.includes('כמה') || question.includes('combien') || question.includes('montant')) {
    facts.push('Identifier les montants concernés');
  }
  if (question.includes('מה') || question.includes('quelle opération')) {
    facts.push('Identifier l\'opération fiscale');
  }
  
  // Remove duplicates
  return [...new Set(facts)].length > 0 ? [...new Set(facts)] : ['Identifiez les personnes et entités impliquées', 'Identifiez les montants et pourcentages'];
}

function identifyPossibleRules(question: string, concepts: TaxConcept[] = []): string[] {
  const rules: string[] = [];
  
  // Add concept-specific rules
  concepts.forEach(concept => {
    if (concept.nomFrancais.includes('dividende')) {
      rules.push('Section 125b - Dividendes (25% ou 30%)');
      rules.push('Bénéficiaire effectif - actionnaire substantiel');
    }
    if (concept.nomFrancais.includes('plus-value')) {
      rules.push('Section 88 - Plus-values sur actions');
      rules.push('Section 94 - Actions à privilèges');
    }
    if (concept.nomFrancais.includes('société')) {
      rules.push('Section 126 - Impôt sur les sociétés');
      rules.push('Personnalité morale séparée');
    }
    if (concept.nomFrancais.includes('prêt')) {
      rules.push('Section 3(9) - Prêts à taux réduit');
      rules.push('Section 3(10) - Retraits d\'une société');
    }
  });
  
  // Original logic as fallback
  if (question.includes('dividende') || question.includes('דיבידנד')) {
    rules.push('Section 125b - Dividendes (25% ou 30%)');
    rules.push('Bénéficiaire effectif - actionnaire substantiel');
  }
  if (question.includes('plus-value') || question.includes('רווח הון')) {
    rules.push('Section 88 - Plus-values sur actions');
    rules.push('Section 94 - Actions à privilèges');
  }
  if (question.includes('société') || question.includes('חברה')) {
    rules.push('Section 126 - Impôt sur les sociétés');
    rules.push('Personnalité morale séparée');
  }
  if (question.includes('prêt') || question.includes('הלוואה')) {
    rules.push('Section 3(9) - Prêts à taux réduit');
    rules.push('Section 3(10) - Retraits d\'une société');
  }
  
  return [...new Set(rules)].length > 0 ? [...new Set(rules)] : ['Règles générales d\'imposition'];
}

function suggestStructure(question: string, concepts: TaxConcept[] = []): string[] {
  // Use concept structure if available
  if (concepts.length > 0 && concepts[0].structureReponseConseillee.length > 0) {
    return concepts[0].structureReponseConseillee;
  }
  
  // Default structure
  return [
    'Faits : Qui, quoi, quand, combien',
    'Règle : Article applicable et taux',
    'Application : Comment la règle s\'applique au cas',
    'Conclusion : Événement fiscal, qui paie, combien, pourquoi'
  ];
}

function identifyErrorsToAvoid(question: string, concepts: TaxConcept[] = []): string[] {
  const errors: string[] = [];
  
  // Add concept-specific errors
  concepts.forEach(concept => {
    errors.push(...concept.erreursFrequentes);
  });
  
  // Default errors
  errors.push(
    'Ne pas oublier d\'identifier le contribuable',
    'Ne pas oublier de mentionner le taux d\'imposition',
    'Ne pas oublier la source du revenu',
    'Ne pas oublier le moment d\'imposition',
    'Ne pas confondre dividendes et salaires',
    'Ne pas oublier de citer les sources'
  );
  
  return [...new Set(errors)];
}

function generateChecklist(concepts: TaxConcept[] = []): string[] {
  const checklist: string[] = [
    'Contribuable identifié',
    'Événement fiscal identifié',
    'Montant imposable indiqué',
    'Source de revenu indiquée',
    'Taux d\'imposition indiqué',
    'Moment d\'imposition indiqué',
    'Sources citées',
    'Conclusion claire'
  ];
  
  // Add concept-specific checklist items
  concepts.forEach(concept => {
    checklist.push(...concept.elementsAVerifier.map(item => `Vérifier : ${item}`));
  });
  
  return [...new Set(checklist)];
}

function identifySubject(question: string, concepts: TaxConcept[] = []): string {
  if (concepts.length > 0) {
    return concepts[0].nomFrancais;
  }
  
  // Fallback to original logic
  if (question.includes('dividende')) return 'Dividendes';
  if (question.includes('plus-value')) return 'Plus-values';
  if (question.includes('société')) return 'Impôt sur les sociétés';
  if (question.includes('prêt')) return 'Prêts et intérêts';
  if (question.includes('partenariat')) return 'Partenariats';
  return 'Fiscalité générale';
}

function extractPersons(question: string, concepts: TaxConcept[] = []): string[] {
  const persons: string[] = [];
  
  // Add concept-specific persons
  concepts.forEach(concept => {
    if (concept.nomFrancais.includes('actionnaire')) {
      persons.push('Actionnaire');
    }
    if (concept.nomFrancais.includes('société')) {
      persons.push('Société');
    }
  });
  
  // Original logic
  if (question.includes('actionnaire') || question.includes('בעל מניות')) {
    persons.push('Actionnaire');
  }
  if (question.includes('société') || question.includes('חברה')) {
    persons.push('Société');
  }
  if (question.includes('partenaire') || question.includes('שותף')) {
    persons.push('Partenaire');
  }
  
  return [...new Set(persons)].length > 0 ? [...new Set(persons)] : ['Identifiez les personnes concernées'];
}

function extractFiscalOperations(question: string, concepts: TaxConcept[] = []): string[] {
  const operations: string[] = [];
  
  // Add concept-specific operations
  concepts.forEach(concept => {
    if (concept.nomFrancais.includes('distribution')) {
      operations.push('Distribution de dividendes');
    }
    if (concept.nomFrancais.includes('vente')) {
      operations.push('Vente d\'actions');
    }
    if (concept.nomFrancais.includes('prêt')) {
      operations.push('Prêt accordé');
    }
  });
  
  // Original logic
  if (question.includes('distribution') || question.includes('חלוקה')) {
    operations.push('Distribution de dividendes');
  }
  if (question.includes('vente') || question.includes('מכירה')) {
    operations.push('Vente d\'actions');
  }
  if (question.includes('prêt') || question.includes('הלוואה')) {
    operations.push('Prêt accordé');
  }
  if (question.includes('retrait') || question.includes('משיכה')) {
    operations.push('Retrait de la société');
  }
  
  return [...new Set(operations)].length > 0 ? [...new Set(operations)] : ['Identifiez l\'opération fiscale'];
}

function identifyArticles(question: string, concepts: TaxConcept[] = []): string[] {
  const articles: string[] = [];
  
  // Add concept-specific articles
  concepts.forEach(concept => {
    if (concept.nomFrancais.includes('dividende')) {
      articles.push('Section 125b');
    }
    if (concept.nomFrancais.includes('plus-value')) {
      articles.push('Section 88');
    }
    if (concept.nomFrancais.includes('société')) {
      articles.push('Section 126');
    }
    if (concept.nomFrancais.includes('prêt')) {
      articles.push('Section 3(9)');
    }
  });
  
  // Original logic
  if (question.includes('dividende')) {
    articles.push('Section 125b');
  }
  if (question.includes('plus-value')) {
    articles.push('Section 88');
  }
  if (question.includes('société')) {
    articles.push('Section 126');
  }
  if (question.includes('prêt')) {
    articles.push('Section 3(9)');
  }
  
  return [...new Set(articles)].length > 0 ? [...new Set(articles)] : ['Identifiez les articles applicables'];
}

function extractDates(question: string): string[] {
  const dates: string[] = [];
  const datePattern = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}|\d{1,2}\.\d{1,2}\.\d{4}/g;
  const matches = question.match(datePattern);
  if (matches) {
    dates.push(...matches);
  }
  return dates.length > 0 ? dates : ['Identifiez les dates importantes'];
}

function extractAmounts(question: string): string[] {
  const amounts: string[] = [];
  const amountPattern = /\$?\s*\d+[,\d]*\s*₪?|\d+\s*%/g;
  const matches = question.match(amountPattern);
  if (matches) {
    amounts.push(...matches);
  }
  return amounts.length > 0 ? amounts : ['Identifiez les montants'];
}

function extractSubQuestions(question: string): string[] {
  const subQuestions: string[] = [];
  if (question.includes('?')) {
    const parts = question.split('?');
    for (let i = 0; i < parts.length - 1; i++) {
      if (parts[i].trim()) {
        subQuestions.push(parts[i].trim() + '?');
      }
    }
  }
  if (question.includes('1.') || question.includes('2.') || question.includes('3.')) {
    const numberedParts = question.split(/\d+\./);
    for (let i = 1; i < numberedParts.length; i++) {
      if (numberedParts[i].trim()) {
        subQuestions.push(numberedParts[i].trim());
      }
    }
  }
  return subQuestions.length > 0 ? subQuestions : ['Analysez tous les aspects de la question'];
}

function identifyPositivePoints(answer: string): string[] {
  const points: string[] = [];
  if (answer.length > 50) {
    points.push('Réponse suffisamment développée');
  }
  if (answer.includes('donc') || answer.includes('par conséquent')) {
    points.push('Présence d\'une conclusion');
  }
  if (answer.includes('%') || answer.includes('taux')) {
    points.push('Taux mentionné');
  }
  return points.length > 0 ? points : ['Réponse fournie'];
}

function identifyMissingElements(answer: string): string[] {
  const missing: string[] = [];
  if (!answer.includes('₪') && !answer.includes('$') && !/\d+/.test(answer)) {
    missing.push('Montant non indiqué');
  }
  if (!answer.includes('%') && !answer.includes('taux')) {
    missing.push('Taux d\'imposition non indiqué');
  }
  if (!answer.includes('section') && !answer.includes('סעיף')) {
    missing.push('Référence légale non citée');
  }
  return missing.length > 0 ? missing : ['Vérifiez que tous les éléments sont présents'];
}

function identifyLegalTaxIssues(answer: string): string[] {
  const issues: string[] = [];
  if (answer.includes('toujours') || answer.includes('jamais')) {
    issues.push('Attention aux termes absolus - vérifiez les exceptions');
  }
  if (answer.length < 30) {
    issues.push('Réponse très courte - risque d\'incomplétude');
  }
  return issues.length > 0 ? issues : ['Vérifiez les règles applicables'];
}

function correctLanguage(answer: string): string {
  let corrected = answer;
  corrected = corrected.replace(/\.+/g, '.');
  corrected = corrected.replace(/,\s*,/g, ',');
  return corrected;
}

function generateImprovementAdvice(answer: string): string[] {
  const advice: string[] = [];
  const lineCount = countLines(answer);
  if (lineCount.exceedsLimit) {
    advice.push('Réduire la réponse à 15 lignes maximum');
  }
  if (answer.split(' ').length < 20) {
    advice.push('Réponse trop courte - développez davantage');
  }
  return advice.length > 0 ? advice : ['Utilisez la structure : Fait → Règle → Application → Conclusion'];
}

function generateFinalChecklist(): string[] {
  return [
    'Répond à la question posée',
    'Contribuable correct',
    'Événement fiscal identifié',
    'Montant imposable',
    'Source de revenu',
    'Taux d\'imposition',
    'Moment d\'imposition',
    'Sources citées',
    'Conclusion présente',
    'Moins de 15 lignes'
  ];
}

function calculateScore(answer: string): { category: 'complete' | 'almost_complete' | 'needs_improvement' | 'incomplete', numeric: number } {
  let score = 50; // Start at 50 (base score)
  
  // Check if sources are cited - CRITICAL
  const hasSources = answer.includes('section') || answer.includes('סעיף') || answer.includes('page');
  if (!hasSources) {
    // Major penalty: no sources = maximum score 50
    return { category: 'incomplete', numeric: 50 };
  }
  
  // Check if source appears to be invented (generic references without specific sections)
  const hasSpecificSource = answer.match(/section\s+\d+|סעיף\s+\d+|page\s+\d+/i);
  if (!hasSpecificSource) {
    // Penalty: generic reference without specific section
    score = Math.min(score, 60);
  }
  
  // Other scoring factors
  if (answer.length > 50) score += 10;
  if (answer.includes('%') || answer.includes('taux')) score += 10;
  if (answer.includes('section') || answer.includes('סעיף')) score += 10;
  if (answer.includes('donc') || answer.includes('par conséquent')) score += 10;
  const lineCount = countLines(answer);
  if (!lineCount.exceedsLimit) score += 10;
  
  // Cap at 100
  score = Math.min(score, 100);
  
  if (score >= 90) return { category: 'complete', numeric: score };
  if (score >= 70) return { category: 'almost_complete', numeric: score };
  if (score >= 50) return { category: 'needs_improvement', numeric: score };
  return { category: 'incomplete', numeric: score };
}

function checkRespondsToQuestion(answer: string, question: string): boolean {
  return answer.length > 30;
}

function checkSubQuestions(answer: string, question: string): boolean {
  return answer.length > 50;
}

function checkTaxpayerIdentified(answer: string): boolean {
  return answer.includes('imposé') || answer.includes('taxé') || answer.includes('חייב');
}

function checkFiscalEvent(answer: string): boolean {
  return answer.includes('événement') || answer.includes('taxation') || answer.includes('אירוע');
}

function checkTaxableAmount(answer: string): boolean {
  return /\d+/.test(answer) || answer.includes('₪') || answer.includes('$');
}

function checkIncomeSource(answer: string): boolean {
  return answer.includes('source') || answer.includes('מקור') || answer.includes('revenu');
}

function checkTaxRate(answer: string): boolean {
  return answer.includes('%') || answer.includes('taux') || answer.includes('שיעור');
}

function checkTaxTiming(answer: string): boolean {
  return answer.includes('moment') || answer.includes('date') || answer.includes('מועד');
}

function checkSourcesCited(answer: string): boolean {
  return answer.includes('section') || answer.includes('סעיף') || answer.includes('page');
}

function checkConclusion(answer: string): boolean {
  return answer.includes('donc') || answer.includes('par conséquent') || answer.includes('לכן');
}

function checkReasoningStructure(answer: string): { facts: boolean; rule: boolean; application: boolean; conclusion: boolean } {
  return {
    facts: answer.length > 30,
    rule: answer.includes('section') || answer.includes('סעיף'),
    application: answer.includes('donc') || answer.includes('par conséquent'),
    conclusion: answer.includes('donc') || answer.includes('par conséquent')
  };
}
