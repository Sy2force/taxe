"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeOpenAI = initializeOpenAI;
exports.isOpenAIEnabled = isOpenAIEnabled;
exports.analyzeQuestionWithAI = analyzeQuestionWithAI;
exports.correctAnswerWithAI = correctAnswerWithAI;
exports.improveStyle = improveStyle;
exports.optimizeAnswer = optimizeAnswer;
const openai_1 = __importDefault(require("openai"));
const prompts_1 = require("../prompts");
let openaiClient = null;
function initializeOpenAI(apiKey) {
    if (apiKey) {
        openaiClient = new openai_1.default({ apiKey });
    }
}
function isOpenAIEnabled() {
    return openaiClient !== null;
}
async function analyzeQuestionWithAI(question, context) {
    if (!openaiClient) {
        throw new Error('OpenAI not configured');
    }
    const response = await openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [
            { role: 'system', content: prompts_1.SYSTEM_PROMPT },
            { role: 'user', content: `Question: ${question}\n\nContexte des documents:\n${context}\n\nAnalyse cette question selon le format demandé.` }
        ],
        temperature: 0.7,
    });
    const content = response.choices[0].message.content || '';
    return parseQuestionAnalysis(content);
}
async function correctAnswerWithAI(answer, question, context) {
    if (!openaiClient) {
        throw new Error('OpenAI not configured');
    }
    const response = await openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [
            { role: 'system', content: prompts_1.SYSTEM_PROMPT },
            { role: 'user', content: `Question: ${question}\n\nRéponse de l'étudiante: ${answer}\n\nContexte des documents:\n${context}\n\nCorrige cette réponse selon le format demandé.` }
        ],
        temperature: 0.7,
    });
    const content = response.choices[0].message.content || '';
    return parseAnswerCorrection(content);
}
async function improveStyle(text) {
    if (!openaiClient) {
        throw new Error('OpenAI not configured');
    }
    const response = await openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [
            { role: 'system', content: prompts_1.SYSTEM_PROMPT },
            { role: 'user', content: `Texte à améliorer: ${text}\n\nCorrige uniquement la langue et le style. Ne change pas le raisonnement. Indique les points juridiques à vérifier.` }
        ],
        temperature: 0.5,
    });
    const content = response.choices[0].message.content || '';
    return parseStyleImprovement(content);
}
async function optimizeAnswer(answer, question) {
    if (!openaiClient) {
        throw new Error('OpenAI not configured');
    }
    const response = await openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [
            { role: 'system', content: prompts_1.SYSTEM_PROMPT },
            { role: 'user', content: `Question: ${question}\n\nRéponse: ${answer}\n\nDonne des conseils pour optimiser cette réponse sans la réécrire complètement.` }
        ],
        temperature: 0.7,
    });
    return response.choices[0].message.content || '';
}
function parseQuestionAnalysis(content) {
    return {
        whatQuestionAsks: extractSection(content, 'Ce que la question demande'),
        factsToIdentify: extractList(content, 'Faits à repérer'),
        keywordsToSearch: extractList(content, 'Mots-clés à chercher'),
        possibleRules: extractList(content, 'Règles possibles à vérifier'),
        usefulPassages: [],
        suggestedStructure: extractList(content, 'Structure conseillée'),
        errorsToAvoid: extractList(content, 'Erreurs à éviter'),
        checklist: extractList(content, 'Checklist'),
    };
}
function parseAnswerCorrection(content) {
    const checklist = extractList(content, 'Checklist finale');
    const missingCount = extractList(content, 'Ce qui manque').length;
    let score = 'incomplete';
    if (missingCount === 0)
        score = 'complete';
    else if (missingCount <= 2)
        score = 'almost_complete';
    else if (missingCount <= 4)
        score = 'needs_improvement';
    return {
        positivePoints: extractList(content, 'Points positifs'),
        missingElements: extractList(content, 'Ce qui manque'),
        legalTaxIssues: extractList(content, 'Problèmes juridiques ou fiscaux à vérifier'),
        languageCorrection: extractSection(content, 'Correction de langue'),
        improvementAdvice: extractList(content, 'Conseils d\'amélioration'),
        finalChecklist: checklist,
        score,
    };
}
function parseStyleImprovement(content) {
    const warnings = extractList(content, 'Attention');
    const correctedText = extractSection(content, 'Version corrigée');
    return { correctedText, warnings };
}
function extractSection(content, sectionName) {
    const regex = new RegExp(`${sectionName}[\\s:]*([\\s\\S]*?)(?=\\n\\d+\\.|\\n[A-Z]|$)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : '';
}
function extractList(content, sectionName) {
    const section = extractSection(content, sectionName);
    return section.split('\n')
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .filter(line => line.length > 0);
}
