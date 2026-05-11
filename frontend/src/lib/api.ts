import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

const axiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'doc' | 'txt';
  pages?: number;
  content: string;
  uploadedAt: string;
}

export interface SearchResult {
  keyword: string;
  extract: string;
  beforeContext: string;
  afterContext: string;
  relevanceScore: number;
  documentId: string;
  documentName: string;
  page?: number;
}

export interface QuestionAnalysis {
  whatQuestionAsks: string;
  factsToIdentify: string[];
  keywordsToSearch: string[];
  possibleRules: string[];
  usefulPassages: SearchResult[];
  suggestedStructure: string[];
  errorsToAvoid: string[];
  checklist: string[];
  subject: string;
  personsConcerned: string[];
  importantDates: string[];
  importantAmounts: string[];
  fiscalOperations: string[];
  articlesOrNotions: string[];
  subQuestions: string[];
}

export interface AnswerCorrection {
  positivePoints: string[];
  missingElements: string[];
  legalTaxIssues: string[];
  languageCorrection: string;
  improvementAdvice: string[];
  finalChecklist: string[];
  score: 'complete' | 'almost_complete' | 'needs_improvement' | 'incomplete';
  scoreNumeric: number;
  respondsToQuestion: boolean;
  allSubQuestionsAddressed: boolean;
  correctTaxpayerIdentified: boolean;
  fiscalEventIdentified: boolean;
  taxableAmountIndicated: boolean;
  incomeSourceIndicated: boolean;
  taxRateIndicated: boolean;
  taxTimingIndicated: boolean;
  sourcesCited: boolean;
  conclusionClear: boolean;
  reasoningStructure: {
    facts: boolean;
    rule: boolean;
    application: boolean;
    conclusion: boolean;
  };
}

export interface LineCount {
  lines: number;
  words: number;
  exceedsLimit: boolean;
}

export interface HomeworkQuestion {
  id: number;
  questionText: string;
  sources: SearchResult[];
  notes: string;
  draftAnswer: string;
  correctedAnswer: string;
  checklist: string[];
  status: 'not_started' | 'sources_found' | 'draft_written' | 'corrected' | 'ready_to_submit' | 'copied_to_document';
  copiedToDocument?: boolean;
  copiedAt?: string;
  generatedAnswer?: string;
  changes?: string[];
}

export interface QuestionAnswerComparison {
  subQuestion: string;
  present: boolean;
  comment: string;
  toAdd: string;
}

export interface CalculationResult {
  calculation: string;
  result: number;
  formula: string;
  steps: string[];
}

// Utility function to enforce 15-line limit on answers
export function enforceLineLimit(text: string, maxLines: number = 15): { text: string; wasReduced: boolean } {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length <= maxLines) {
    return { text, wasReduced: false };
  }
  
  // Keep the first maxLines, prioritizing conclusion
  const reducedLines = lines.slice(0, maxLines);
  const reducedText = reducedLines.join('\n');
  
  return { text: reducedText, wasReduced: true };
}

// Utility function to detect questions from text
export function detectQuestions(text: string): string[] {
  const questions: string[] = [];
  const lines = text.split('\n');
  
  // Patterns for question detection
  const patterns = [
    /^(\d+\.|\d+\))\s+(.+)/,  // 1. Question or 1) Question
    /^(שאלה\s*\d+\.|שאלה\s*\d+\)):?\s*/i,  // Hebrew: שאלה 1:
    /^question\s*\d+\.|question\s*\d+\):?\s*/i,  // English: Question 1:
  ];
  
  let currentQuestion = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    let isQuestionStart = false;
    
    for (const pattern of patterns) {
      if (pattern.test(trimmedLine)) {
        if (currentQuestion) {
          questions.push(currentQuestion.trim());
        }
        currentQuestion = trimmedLine;
        isQuestionStart = true;
        break;
      }
    }
    
    if (!isQuestionStart && currentQuestion) {
      currentQuestion += '\n' + trimmedLine;
    }
  }
  
  if (currentQuestion) {
    questions.push(currentQuestion.trim());
  }
  
  return questions;
}

export interface GuidedAnswerSection {
  title: string;
  content: string;
}

export interface GuidedAnswer {
  title: string;
  sections: GuidedAnswerSection[];
  metadata: {
    subject: string;
    detectedConcepts: string[];
    sourceCount: number;
  };
}

export interface HomeworkVerificationCheck {
  hasAnswer: boolean;
  hasSource: boolean;
  hasRule: boolean;
  hasCalculation: boolean;
  hasConclusion: boolean;
  withinLineLimit: boolean;
}

export interface VerificationItem {
  id: number;
  status: 'ready' | 'needs_improvement' | 'incomplete';
  score: number;
  checks: HomeworkVerificationCheck;
  issues: string[];
}

export interface VerificationSummary {
  total: number;
  ready: number;
  needsImprovement: number;
  incomplete: number;
}

// Documents
export const documentsApi = {
  upload: async (file: File): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post('/upload', formData);
    return response.data;
  },

  getAll: async (): Promise<Document[]> => {
    const response = await axiosInstance.get('/documents');
    return response.data;
  },

  get: async (id: string): Promise<Document> => {
    const response = await axiosInstance.get(`/documents/${id}`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/documents/${id}`);
  },

  search: async (query: string): Promise<SearchResult[]> => {
    const response = await axiosInstance.post('/search', { query });
    return response.data;
  },

  countLines: async (text: string): Promise<{ lineCount: number }> => {
    const response = await axiosInstance.post('/count-lines', { text });
    return response.data;
  },

  uploadExercise: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post('/upload-exercise', formData);
    return response.data;
  },

  uploadLaws: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post('/upload-laws', formData);
    return response.data;
  },

  generateAnswer: async (questionId: number, questionText: string): Promise<any> => {
    const response = await axiosInstance.post('/generate-answer', { questionId, questionText });
    return response.data;
  },

  analyzeQuestion: async (questionText: string): Promise<QuestionAnalysis> => {
    const response = await axiosInstance.post('/analyze-question', { questionText });
    return response.data;
  },

  correctAnswer: async (questionText: string, answerText: string): Promise<AnswerCorrection> => {
    const response = await axiosInstance.post('/correct-answer', { questionText, answerText });
    return response.data;
  },

  improveStyle: async (text: string): Promise<{ improvedText: string }> => {
    const response = await axiosInstance.post('/improve-style', { text });
    return response.data;
  },

  optimizeAnswer: async (question: string, answer: string): Promise<{ optimizedAnswer: string }> => {
    const response = await axiosInstance.post('/optimize-answer', { question, answer });
    return response.data;
  },

  getHomeworkQuestions: async (): Promise<HomeworkQuestion[]> => {
    const response = await axiosInstance.get('/homework-questions');
    return response.data;
  },

  getHomeworkQuestion: async (id: number): Promise<HomeworkQuestion> => {
    const response = await axiosInstance.get(`/homework-questions/${id}`);
    return response.data;
  },

  updateHomeworkQuestion: async (id: number, updates: Partial<HomeworkQuestion>): Promise<HomeworkQuestion> => {
    const response = await axiosInstance.put(`/homework-questions/${id}`, updates);
    return response.data;
  },

  deleteHomeworkQuestion: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/homework-questions/${id}`);
  },

  checkFinalAnswerRequest: async (text: string): Promise<{ isFinalAnswerRequest: boolean; response?: string }> => {
    const response = await axiosInstance.post('/check-final-answer-request', { text });
    return response.data;
  },

  compareQuestionAnswer: async (question: string, answer: string): Promise<{ comparison: QuestionAnswerComparison[] }> => {
    const response = await axiosInstance.post('/compare-question-answer', { question, answer });
    return response.data;
  },

  reduceLines: async (text: string): Promise<{ originalLines: number; reducedLines: number; reducedText: string; suggestions: string[] }> => {
    const response = await axiosInstance.post('/reduce-lines', { text });
    return response.data;
  },

  correctLanguageOnly: async (text: string): Promise<{ correctedText: string }> => {
    const response = await axiosInstance.post('/correct-language-only', { text });
    return response.data;
  },

  verifyCalculations: async (text: string): Promise<{ calculations: CalculationResult[]; disclaimer: string }> => {
    const response = await axiosInstance.post('/verify-calculations', { text });
    return response.data;
  },

  generateGuidedAnswer: async (question: string, useAI: boolean = false): Promise<{ success: boolean; guidedAnswer: GuidedAnswer; message?: string }> => {
    const response = await axiosInstance.post('/generate-guided-answer', { question, useAI });
    return response.data;
  },

  verifyHomework: async (questions: HomeworkQuestion[]): Promise<{ overallStatus: string; verification: VerificationItem[]; summary: VerificationSummary }> => {
    const response = await axiosInstance.post('/verify-homework', { questions });
    return response.data;
  },

  // Database persistence routes
  getSavedAnswers: async (): Promise<any[]> => {
    const response = await axiosInstance.get('/db/saved-answers');
    return response.data;
  },

  getExerciseDocument: async (): Promise<any> => {
    const response = await axiosInstance.get('/db/exercise-document');
    return response.data;
  },

  getLawsDocument: async (): Promise<any> => {
    const response = await axiosInstance.get('/db/laws-document');
    return response.data;
  },

  getAllSavedDocuments: async (): Promise<any[]> => {
    const response = await axiosInstance.get('/db/all-documents');
    return response.data;
  },
};

// Named exports for backward compatibility
export const analysisApi = {
  analyzeQuestion: documentsApi.analyzeQuestion,
  correctAnswer: documentsApi.correctAnswer,
  improveStyle: documentsApi.improveStyle,
  optimizeAnswer: documentsApi.optimizeAnswer,
  countLines: documentsApi.countLines,
  getHomeworkQuestions: documentsApi.getHomeworkQuestions,
  getHomeworkQuestion: documentsApi.getHomeworkQuestion,
  updateHomeworkQuestion: documentsApi.updateHomeworkQuestion,
  deleteHomeworkQuestion: documentsApi.deleteHomeworkQuestion,
  createHomeworkQuestion: async (question: Partial<HomeworkQuestion>): Promise<HomeworkQuestion> => {
    const response = await axiosInstance.post('/homework-questions', question);
    return response.data;
  },
  generateGuidedAnswer: documentsApi.generateGuidedAnswer,
};

export const searchApi = {
  search: documentsApi.search,
  searchDocuments: documentsApi.search,
};

export const homeworkApi = {
  getHomeworkQuestions: documentsApi.getHomeworkQuestions,
  getHomeworkQuestion: documentsApi.getHomeworkQuestion,
  createHomeworkQuestion: async (question: Partial<HomeworkQuestion>): Promise<HomeworkQuestion> => {
    const response = await axiosInstance.post('/homework-questions', question);
    return response.data;
  },
  updateHomeworkQuestion: documentsApi.updateHomeworkQuestion,
  deleteHomeworkQuestion: documentsApi.deleteHomeworkQuestion,
};

export default documentsApi;
