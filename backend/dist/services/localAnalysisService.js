"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeQuestionLocally = analyzeQuestionLocally;
exports.correctAnswerLocally = correctAnswerLocally;
const documentService_1 = require("./documentService");
const HEBREW_KEYWORDS = [
    'דיבידנד', 'רווח הון', 'מס חברות', 'מניות', 'בעל מניות',
    'חברה', 'תושב ישראל', 'הכנסה חייבת', 'שיעור המס', 'מקור ההכנסה',
    'חברה נשלטת זרה', 'חברת משלח יד זרה'
];
function analyzeQuestionLocally(question) {
    const keywords = extractKeywords(question);
    const searchResults = (0, documentService_1.searchInDocuments)(keywords.join(' '));
    return {
        whatQuestionAsks: identifyWhatQuestionAsks(question),
        factsToIdentify: extractFacts(question),
        keywordsToSearch: keywords,
        possibleRules: suggestRules(keywords),
        usefulPassages: searchResults.slice(0, 5),
        suggestedStructure: ['Fait', 'Règle', 'Application', 'Conclusion'],
        errorsToAvoid: [
            'Ne pas identifier les faits',
            'Oublier de citer la règle fiscale',
            'Ne pas appliquer la règle au cas',
            'Oublier la conclusion',
            'Dépasser 15 lignes'
        ],
        checklist: generateChecklist()
    };
}
function correctAnswerLocally(answer, question) {
    const lineCount = (0, documentService_1.countLines)(answer);
    const missingElements = identifyMissingElements(answer, question);
    let score = 'incomplete';
    if (missingElements.length === 0 && !lineCount.exceedsLimit)
        score = 'complete';
    else if (missingElements.length <= 2 && !lineCount.exceedsLimit)
        score = 'almost_complete';
    else if (missingElements.length <= 4)
        score = 'needs_improvement';
    return {
        positivePoints: identifyPositivePoints(answer),
        missingElements,
        legalTaxIssues: identifyLegalIssues(answer),
        languageCorrection: 'Utilisez le mode IA pour une correction linguistique avancée',
        improvementAdvice: generateImprovementAdvice(answer, question),
        finalChecklist: generateFinalChecklist(answer),
        score
    };
}
function extractKeywords(question) {
    const keywords = [];
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
function identifyWhatQuestionAsks(question) {
    if (question.toLowerCase().includes('calculer') || question.toLowerCase().includes('montant')) {
        return 'La question demande de calculer un montant ou un taux d\'imposition';
    }
    if (question.toLowerCase().includes('expliquer') || question.toLowerCase().includes('définir')) {
        return 'La question demande d\'expliquer ou définir un concept';
    }
    if (question.toLowerCase().includes('condition') || question.toLowerCase().includes('critère')) {
        return 'La question demande d\'identifier les conditions ou critères';
    }
    return 'La question demande d\'analyser une situation fiscale';
}
function extractFacts(question) {
    const facts = [];
    const patterns = [
        /(\d+%)\s*(?:d'impôt|de taxe)/gi,
        /(résident|non-résident|israélien|étranger)/gi,
        /(société|entreprise|compagnie)/gi,
        /(dividende|bénéfice|revenu)/gi
    ];
    for (const pattern of patterns) {
        const matches = question.match(pattern);
        if (matches) {
            facts.push(...matches);
        }
    }
    return facts.length > 0 ? facts : ['Identifiez les personnes et entités impliquées', 'Identifiez les montants et pourcentages'];
}
function suggestRules(keywords) {
    const rules = [];
    if (keywords.some(k => k.includes('דיבידנד') || k.includes('dividende'))) {
        rules.push('Règles de taxation des dividendes');
    }
    if (keywords.some(k => k.includes('מס חברות') || k.includes('impôt'))) {
        rules.push('Taux d\'imposition des sociétés');
    }
    if (keywords.some(k => k.includes('תושב ישראל') || k.includes('résident'))) {
        rules.push('Règles de résidence fiscale');
    }
    return rules.length > 0 ? rules : ['Règles générales d\'imposition'];
}
function identifyMissingElements(answer, question) {
    const missing = [];
    const lowerAnswer = answer.toLowerCase();
    if (!lowerAnswer.includes('règle') && !lowerAnswer.includes('loi') && !lowerAnswer.includes('article')) {
        missing.push('Règle fiscale ou article de loi');
    }
    if (!lowerAnswer.includes('conclusion') && !lowerAnswer.includes('donc') && !lowerAnswer.includes('en conséquence')) {
        missing.push('Conclusion claire');
    }
    if (!/\d+%/.test(answer) && question.toLowerCase().includes('calcul')) {
        missing.push('Taux ou montant d\'imposition');
    }
    if (answer.split('\n').filter(l => l.trim()).length > 15) {
        missing.push('Respect de la limite de 15 lignes');
    }
    return missing;
}
function identifyPositivePoints(answer) {
    const positive = [];
    if (answer.toLowerCase().includes('donc') || answer.toLowerCase().includes('en conséquence')) {
        positive.push('Présence d\'une conclusion');
    }
    if (/\d+%/.test(answer)) {
        positive.push('Mention de taux ou montants');
    }
    if (answer.length > 100) {
        positive.push('Réponse développée');
    }
    return positive.length > 0 ? positive : ['Réponse fournie'];
}
function identifyLegalIssues(answer) {
    const issues = [];
    const lowerAnswer = answer.toLowerCase();
    if (!lowerAnswer.includes('article') && !lowerAnswer.includes('loi')) {
        issues.push('Vérifier les articles de loi applicables');
    }
    if (!lowerAnswer.includes('source') && !lowerAnswer.includes('référence')) {
        issues.push('Ajouter des références aux sources');
    }
    return issues;
}
function generateImprovementAdvice(answer, question) {
    const advice = [];
    const lineCount = (0, documentService_1.countLines)(answer);
    if (lineCount.exceedsLimit) {
        advice.push('Réduire la réponse à 15 lignes maximum');
    }
    if (!answer.includes('\n')) {
        advice.push('Structurer la réponse en paragraphes');
    }
    advice.push('Utiliser la structure : Fait → Règle → Application → Conclusion');
    return advice;
}
function generateChecklist() {
    return [
        'Toutes les sous-questions sont traitées',
        'Les faits importants sont mentionnés',
        'La règle fiscale est indiquée',
        'L\'application au cas est claire',
        'La conclusion est présente',
        'Les sources sont citées',
        'La réponse fait moins de 15 lignes'
    ];
}
function generateFinalChecklist(answer) {
    const checklist = generateChecklist();
    const lineCount = (0, documentService_1.countLines)(answer);
    if (lineCount.exceedsLimit) {
        checklist[6] = '❌ La réponse dépasse 15 lignes';
    }
    else {
        checklist[6] = '✓ La réponse fait moins de 15 lignes';
    }
    return checklist;
}
