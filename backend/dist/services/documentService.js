"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUploadDir = ensureUploadDir;
exports.extractTextFromFile = extractTextFromFile;
exports.saveDocument = saveDocument;
exports.getDocument = getDocument;
exports.getAllDocuments = getAllDocuments;
exports.deleteDocument = deleteDocument;
exports.searchInDocuments = searchInDocuments;
exports.countLines = countLines;
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const mammoth_1 = __importDefault(require("mammoth"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const documents = new Map();
const UPLOAD_DIR = path_1.default.join(__dirname, '../../uploads');
async function ensureUploadDir() {
    try {
        await promises_1.default.access(UPLOAD_DIR);
    }
    catch {
        await promises_1.default.mkdir(UPLOAD_DIR, { recursive: true });
    }
}
async function extractTextFromFile(file) {
    const filePath = file.path;
    const extension = path_1.default.extname(file.originalname).toLowerCase();
    switch (extension) {
        case '.pdf':
            return await extractFromPDF(filePath);
        case '.docx':
            return await extractFromDocx(filePath);
        case '.txt':
            return await extractFromTxt(filePath);
        default:
            throw new Error(`Unsupported file type: ${extension}`);
    }
}
async function extractFromPDF(filePath) {
    const dataBuffer = await promises_1.default.readFile(filePath);
    const data = await (0, pdf_parse_1.default)(dataBuffer);
    return { text: data.text, pages: data.numpages };
}
async function extractFromDocx(filePath) {
    const dataBuffer = await promises_1.default.readFile(filePath);
    const result = await mammoth_1.default.extractRawText({ buffer: dataBuffer });
    return { text: result.value };
}
async function extractFromTxt(filePath) {
    const text = await promises_1.default.readFile(filePath, 'utf-8');
    return { text };
}
function saveDocument(document) {
    documents.set(document.id, document);
}
function getDocument(id) {
    return documents.get(id);
}
function getAllDocuments() {
    return Array.from(documents.values());
}
function deleteDocument(id) {
    return documents.delete(id);
}
function searchInDocuments(query) {
    const results = [];
    const keywords = query.toLowerCase().split(/\s+/);
    for (const [docId, doc] of documents) {
        const text = doc.content.toLowerCase();
        const lines = doc.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            let matchScore = 0;
            for (const keyword of keywords) {
                if (line.includes(keyword)) {
                    matchScore++;
                }
            }
            if (matchScore > 0) {
                const beforeContext = lines[Math.max(0, i - 2)];
                const afterContext = lines[Math.min(lines.length - 1, i + 2)];
                results.push({
                    keyword: query,
                    extract: lines[i],
                    beforeContext,
                    afterContext,
                    relevanceScore: matchScore / keywords.length,
                    documentId: docId,
                    documentName: doc.name
                });
            }
        }
    }
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}
function countLines(text) {
    const lines = text.split('\n').filter(line => line.trim().length > 0).length;
    const words = text.split(/\s+/).filter(word => word.length > 0).length;
    const exceedsLimit = lines > 15;
    return { lines, words, exceedsLimit };
}
