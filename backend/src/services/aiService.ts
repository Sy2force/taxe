import OpenAI from 'openai';
import { SYSTEM_PROMPT } from '../prompts';
import { QuestionAnalysis, AnswerCorrection } from '../types';

let openaiClient: OpenAI | null = null;

export function initializeOpenAI(apiKey: string): void {
  if (apiKey) {
    openaiClient = new OpenAI({ apiKey });
  }
}

export function isOpenAIEnabled(): boolean {
  return openaiClient !== null;
}

export async function analyzeQuestionWithAI(question: string, context: string): Promise<QuestionAnalysis> {
  if (!openaiClient) {
    throw new Error('OpenAI not configured');
  }

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Question: ${question}\n\nContexte des documents:\n${context}\n\nAnalyse cette question selon le format demandé.` }
    ],
    temperature: 0.7,
  });

  const content = response.choices[0].message.content || '';
  return parseQuestionAnalysis(content);
}

export async function correctAnswerWithAI(answer: string, question: string, context: string): Promise<AnswerCorrection> {
  if (!openaiClient) {
    throw new Error('OpenAI not configured');
  }

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Question: ${question}\n\nRéponse de l'étudiante: ${answer}\n\nContexte des documents:\n${context}\n\nCorrige cette réponse selon le format demandé.` }
    ],
    temperature: 0.7,
  });

  const content = response.choices[0].message.content || '';
  return parseAnswerCorrection(content);
}

export async function improveStyle(text: string): Promise<{ correctedText: string; warnings: string[] }> {
  if (!openaiClient) {
    throw new Error('OpenAI not configured');
  }

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Texte à améliorer: ${text}\n\nCorrige uniquement la langue et le style. Ne change pas le raisonnement. Indique les points juridiques à vérifier.` }
    ],
    temperature: 0.5,
  });

  const content = response.choices[0].message.content || '';
  return parseStyleImprovement(content);
}

export async function optimizeAnswer(answer: string, question: string): Promise<string> {
  if (!openaiClient) {
    throw new Error('OpenAI not configured');
  }

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Question: ${question}\n\nRéponse: ${answer}\n\nDonne des conseils pour optimiser cette réponse sans la réécrire complètement.` }
    ],
    temperature: 0.7,
  });

  return response.choices[0].message.content || '';
}

function parseQuestionAnalysis(content: string): QuestionAnalysis {
  return {
    whatQuestionAsks: extractSection(content, 'Ce que la question demande'),
    factsToIdentify: extractList(content, 'Faits à repérer'),
    keywordsToSearch: extractList(content, 'Mots-clés à chercher'),
    possibleRules: extractList(content, 'Règles possibles à vérifier'),
    usefulPassages: [],
    suggestedStructure: extractList(content, 'Structure conseillée'),
    errorsToAvoid: extractList(content, 'Erreurs à éviter'),
    checklist: extractList(content, 'Checklist'),
    subject: extractSection(content, 'Sujet fiscal'),
    personsConcerned: extractList(content, 'Personnes concernées'),
    importantDates: extractList(content, 'Dates importantes'),
    importantAmounts: extractList(content, 'Montants importants'),
    fiscalOperations: extractList(content, 'Opérations fiscales'),
    articlesOrNotions: extractList(content, 'Articles ou notions'),
    subQuestions: extractList(content, 'Sous-questions'),
  };
}

function parseAnswerCorrection(content: string): AnswerCorrection {
  const checklist = extractList(content, 'Checklist finale');
  const missingCount = extractList(content, 'Ce qui manque').length;
  
  let score: AnswerCorrection['score'] = 'incomplete';
  if (missingCount === 0) score = 'complete';
  else if (missingCount <= 2) score = 'almost_complete';
  else if (missingCount <= 4) score = 'needs_improvement';

  const scoreNumeric = missingCount === 0 ? 100 : Math.max(0, 100 - (missingCount * 15));

  return {
    positivePoints: extractList(content, 'Points positifs'),
    missingElements: extractList(content, 'Ce qui manque'),
    legalTaxIssues: extractList(content, 'Problèmes juridiques ou fiscaux à vérifier'),
    languageCorrection: extractSection(content, 'Correction de langue'),
    improvementAdvice: extractList(content, 'Conseils d\'amélioration'),
    finalChecklist: checklist,
    score,
    scoreNumeric,
    respondsToQuestion: missingCount < 3,
    allSubQuestionsAddressed: missingCount === 0,
    correctTaxpayerIdentified: content.toLowerCase().includes('contribuable'),
    fiscalEventIdentified: content.toLowerCase().includes('événement'),
    taxableAmountIndicated: content.toLowerCase().includes('montant'),
    incomeSourceIndicated: content.toLowerCase().includes('source'),
    taxRateIndicated: content.toLowerCase().includes('taux'),
    taxTimingIndicated: content.toLowerCase().includes('moment') || content.toLowerCase().includes('date'),
    sourcesCited: content.toLowerCase().includes('source') || content.toLowerCase().includes('section'),
    conclusionClear: content.toLowerCase().includes('conclusion'),
    reasoningStructure: {
      facts: content.toLowerCase().includes('faits'),
      rule: content.toLowerCase().includes('règle'),
      application: content.toLowerCase().includes('application'),
      conclusion: content.toLowerCase().includes('conclusion'),
    },
  };
}

function parseStyleImprovement(content: string): { correctedText: string; warnings: string[] } {
  const warnings = extractList(content, 'Attention');
  const correctedText = extractSection(content, 'Version corrigée');
  return { correctedText, warnings };
}

function extractSection(content: string, sectionName: string): string {
  const regex = new RegExp(`${sectionName}[\\s:]*([\\s\\S]*?)(?=\\n\\d+\\.|\\n[A-Z]|$)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function extractList(content: string, sectionName: string): string[] {
  const section = extractSection(content, sectionName);
  return section.split('\n')
    .map(line => line.replace(/^[-•*]\s*/, '').trim())
    .filter(line => line.length > 0);
}
