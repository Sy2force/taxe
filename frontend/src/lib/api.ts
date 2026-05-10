import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

const api = axios.create({
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
  status: 'not_started' | 'sources_found' | 'draft_written' | 'corrected' | 'ready_to_submit';
}

export interface QuestionAnswerComparison {
  subQuestion: string;
  present: boolean;
  comment: string;
  toAdd: string;
}

export interface CalculationResult {
  expression: string;
  result: number;
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
    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getAll: async (): Promise<Document[]> => {
    const response = await api.get('/documents');
    return response.data;
  },

  getById: async (id: string): Promise<Document> => {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },
};

// Search
export const searchApi = {
  search: async (query: string): Promise<SearchResult[]> => {
    const response = await api.post('/search', { query });
    return response.data;
  },
};

// Analysis
export const analysisApi = {
  analyzeQuestion: async (question: string, useAI: boolean = false): Promise<QuestionAnalysis> => {
    const response = await api.post('/analyze-question', { question, useAI });
    return response.data;
  },

  correctAnswer: async (answer: string, question: string, useAI: boolean = false): Promise<AnswerCorrection> => {
    const response = await api.post('/correct-answer', { answer, question, useAI });
    return response.data;
  },

  improveStyle: async (text: string): Promise<string> => {
    const response = await api.post('/improve-style', { text });
    return response.data;
  },

  optimizeAnswer: async (answer: string, question: string): Promise<string> => {
    const response = await api.post('/optimize-answer', { answer, question });
    return response.data;
  },

  countLines: async (text: string): Promise<LineCount> => {
    const response = await api.post('/count-lines', { text });
    return response.data;
  },

  getEthicalWarning: async (): Promise<{ warning: string }> => {
    const response = await api.get('/ethical-warning');
    return response.data;
  },

  createHomeworkQuestion: async (id: number, questionText: string): Promise<HomeworkQuestion> => {
    const response = await api.post('/homework-questions', { id, questionText });
    return response.data;
  },

  getHomeworkQuestions: async (): Promise<HomeworkQuestion[]> => {
    const response = await api.get('/homework-questions');
    return response.data;
  },

  getHomeworkQuestion: async (id: number): Promise<HomeworkQuestion> => {
    const response = await api.get(`/homework-questions/${id}`);
    return response.data;
  },

  updateHomeworkQuestion: async (id: number, updates: Partial<HomeworkQuestion>): Promise<HomeworkQuestion> => {
    const response = await api.put(`/homework-questions/${id}`, updates);
    return response.data;
  },

  deleteHomeworkQuestion: async (id: number): Promise<void> => {
    await api.delete(`/homework-questions/${id}`);
  },

  checkFinalAnswerRequest: async (text: string): Promise<{ isFinalAnswerRequest: boolean; response?: string }> => {
    const response = await api.post('/check-final-answer-request', { text });
    return response.data;
  },

  compareQuestionAnswer: async (question: string, answer: string): Promise<{ comparison: QuestionAnswerComparison[] }> => {
    const response = await api.post('/compare-question-answer', { question, answer });
    return response.data;
  },

  reduceLines: async (text: string): Promise<{ originalLines: number; reducedLines: number; reducedText: string; suggestions: string[] }> => {
    const response = await api.post('/reduce-lines', { text });
    return response.data;
  },

  correctLanguageOnly: async (text: string): Promise<{ correctedText: string }> => {
    const response = await api.post('/correct-language-only', { text });
    return response.data;
  },

  verifyCalculations: async (text: string): Promise<{ calculations: CalculationResult[]; disclaimer: string }> => {
    const response = await api.post('/verify-calculations', { text });
    return response.data;
  },

  generateGuidedAnswer: async (question: string, useAI: boolean = false): Promise<{ success: boolean; guidedAnswer: GuidedAnswer; message?: string }> => {
    const response = await api.post('/generate-guided-answer', { question, useAI });
    return response.data;
  },

  verifyHomework: async (questions: HomeworkQuestion[]): Promise<{ overallStatus: string; verification: VerificationItem[]; summary: VerificationSummary }> => {
    const response = await api.post('/verify-homework', { questions });
    return response.data;
  },
};
