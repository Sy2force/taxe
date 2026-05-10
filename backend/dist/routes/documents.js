"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const documentService_1 = require("../services/documentService");
const localAnalysisService_1 = require("../services/localAnalysisService");
const aiService_1 = require("../services/aiService");
const prompts_1 = require("../prompts");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ dest: 'uploads/' });
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const { text, pages } = await (0, documentService_1.extractTextFromFile)(req.file);
        const document = {
            id: (0, uuid_1.v4)(),
            name: req.file.originalname,
            type: path_1.default.extname(req.file.originalname).toLowerCase().slice(1),
            pages,
            content: text,
            uploadedAt: new Date()
        };
        (0, documentService_1.saveDocument)(document);
        res.json(document);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to process file' });
    }
});
router.get('/documents', (req, res) => {
    const documents = (0, documentService_1.getAllDocuments)();
    res.json(documents);
});
router.get('/documents/:id', (req, res) => {
    const document = (0, documentService_1.getDocument)(req.params.id);
    if (!document) {
        return res.status(404).json({ error: 'Document not found' });
    }
    res.json(document);
});
router.delete('/documents/:id', (req, res) => {
    const deleted = (0, documentService_1.deleteDocument)(req.params.id);
    if (!deleted) {
        return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ success: true });
});
router.post('/search', (req, res) => {
    const { query } = req.body;
    const results = (0, documentService_1.searchInDocuments)(query);
    res.json(results);
});
router.post('/analyze-question', async (req, res) => {
    const { question, useAI } = req.body;
    if (useAI && (0, aiService_1.isOpenAIEnabled)()) {
        try {
            const documents = (0, documentService_1.getAllDocuments)();
            const context = documents.map(d => d.content).join('\n\n');
            const analysis = await (0, aiService_1.analyzeQuestionWithAI)(question, context);
            res.json(analysis);
        }
        catch (error) {
            res.status(500).json({ error: 'AI analysis failed' });
        }
    }
    else {
        const analysis = (0, localAnalysisService_1.analyzeQuestionLocally)(question);
        res.json(analysis);
    }
});
router.post('/correct-answer', async (req, res) => {
    const { answer, question, useAI } = req.body;
    if (useAI && (0, aiService_1.isOpenAIEnabled)()) {
        try {
            const documents = (0, documentService_1.getAllDocuments)();
            const context = documents.map(d => d.content).join('\n\n');
            const correction = await (0, aiService_1.correctAnswerWithAI)(answer, question, context);
            res.json(correction);
        }
        catch (error) {
            res.status(500).json({ error: 'AI correction failed' });
        }
    }
    else {
        const correction = (0, localAnalysisService_1.correctAnswerLocally)(answer, question);
        res.json(correction);
    }
});
router.post('/improve-style', async (req, res) => {
    const { text } = req.body;
    if ((0, aiService_1.isOpenAIEnabled)()) {
        try {
            const result = await (0, aiService_1.improveStyle)(text);
            res.json(result);
        }
        catch (error) {
            res.status(500).json({ error: 'Style improvement failed' });
        }
    }
    else {
        res.json({
            correctedText: text,
            warnings: ['Activez l\'API OpenAI pour une correction linguistique avancée']
        });
    }
});
router.post('/optimize-answer', async (req, res) => {
    const { answer, question } = req.body;
    if ((0, aiService_1.isOpenAIEnabled)()) {
        try {
            const advice = await (0, aiService_1.optimizeAnswer)(answer, question);
            res.json({ advice });
        }
        catch (error) {
            res.status(500).json({ error: 'Optimization failed' });
        }
    }
    else {
        res.json({
            advice: 'Utilisez le mode IA pour des conseils d\'optimisation personnalisés'
        });
    }
});
router.post('/count-lines', (req, res) => {
    const { text } = req.body;
    const count = (0, documentService_1.countLines)(text);
    res.json(count);
});
router.get('/ethical-warning', (req, res) => {
    res.json({ warning: prompts_1.ETHICAL_WARNING });
});
exports.default = router;
