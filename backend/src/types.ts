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

export interface ProfessorInstructions {
  personalWorkRequired: boolean;
  aiGeneratedTextProhibited: boolean;
  aiBrainstormingAllowed: boolean;
  aiStructureAllowed: boolean;
  aiGrammarCorrectionAllowed: boolean;
  sourceCitationRequired: boolean;
  allQuestionsRequired: boolean;
  lineLimit: number;
  wordFormatRequired: boolean;
  aiDeclarationRequired: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}
