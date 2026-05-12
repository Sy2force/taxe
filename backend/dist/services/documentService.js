import { createRequire } from 'module';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
// import { searchConcepts, type TaxConcept } from './taxKnowledgeBase.js'; // Moved to legacy
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
const documents = new Map();
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
export async function ensureUploadDir() {
    try {
        await fs.access(UPLOAD_DIR);
    }
    catch {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
    }
}
export async function extractTextFromFile(file) {
    const filePath = file.path;
    const extension = path.extname(file.originalname).toLowerCase();
    switch (extension) {
        case '.pdf':
            return await extractFromPDF(filePath);
        case '.docx':
            return await extractFromDocx(filePath);
        case '.doc':
            return await extractFromDoc(filePath);
        case '.rtf':
            return await extractFromRtf(filePath);
        case '.odt':
            return await extractFromOdt(filePath);
        case '.txt':
            return await extractFromTxt(filePath);
        case '.md':
            return await extractFromMarkdown(filePath);
        default:
            throw new Error(`Type de fichier non supporté: ${extension}. Formats supportés: PDF, DOCX, DOC, RTF, ODT, TXT, MD`);
    }
}
async function extractFromPDF(filePath) {
    console.log("[PDF] parsing started");
    let data;
    try {
        const dataBuffer = await fs.readFile(filePath);
        console.log("[PDF] file size:", dataBuffer.length);
        data = await pdf(dataBuffer);
        console.log("[PDF] pages:", data.numpages);
        console.log("[PDF] text length:", data.text.length);
    }
    catch (error) {
        console.error("[PDF] parse error:", error);
        throw new Error('Impossible de lire ce PDF. Il est peut-être protégé, corrompu ou mal encodé.');
    }
    const text = data.text.trim();
    if (text.length === 0) {
        console.error("[PDF] empty text - likely scanned PDF");
        throw new Error('Ce PDF semble être scanné ou composé d\'images. Aucun texte sélectionnable n\'a été trouvé. Utilisez un PDF texte ou ajoutez une fonction OCR.');
    }
    console.log("[PDF] parsing complete");
    return { text, pages: data.numpages };
}
async function extractFromDocx(filePath) {
    try {
        const dataBuffer = await fs.readFile(filePath);
        const result = await mammoth.extractRawText({ buffer: dataBuffer });
        let text = result.value.trim();
        // Clean up text artifacts
        text = text.replace(/\r\n/g, '\n');
        text = text.replace(/\n{3,}/g, '\n\n');
        text = text.replace(/[^\S\n]+/g, ' ');
        if (text.length === 0) {
            throw new Error('Le fichier DOCX a été ouvert, mais aucun texte exploitable n\'a été trouvé.');
        }
        return { text };
    }
    catch (error) {
        throw new Error('Impossible de lire ce fichier DOCX. Il est peut-être protégé ou corrompu.');
    }
}
async function extractFromTxt(filePath) {
    try {
        const text = await fs.readFile(filePath, 'utf-8');
        const trimmedText = text.trim();
        if (trimmedText.length === 0) {
            throw new Error('Le fichier TXT est vide.');
        }
        return { text: trimmedText };
    }
    catch (error) {
        throw new Error('Impossible de lire ce fichier TXT. Il est peut-être corrompu ou mal encodé.');
    }
}
async function extractFromRtf(filePath) {
    // RTF files can be converted using LibreOffice similar to DOC
    const libreOfficeCommands = [
        'soffice',
        'libreoffice',
        '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    ];
    let libreOfficePath = null;
    for (const cmd of libreOfficeCommands) {
        try {
            await fs.access(cmd);
            libreOfficePath = cmd;
            break;
        }
        catch {
            continue;
        }
    }
    if (!libreOfficePath) {
        throw new Error('LibreOffice est nécessaire pour convertir les fichiers RTF. Installez LibreOffice ou convertissez le fichier en .docx ou .txt.');
    }
    const tempDir = path.join(UPLOAD_DIR, 'temp_conversion');
    await fs.mkdir(tempDir, { recursive: true });
    const docxOutputPath = path.join(tempDir, path.basename(filePath, '.rtf') + '.docx');
    try {
        await new Promise((resolve, reject) => {
            const process = spawn(libreOfficePath, ['--headless', '--convert-to', 'docx', '--outdir', tempDir, filePath]);
            process.on('close', (code) => {
                if (code === 0)
                    resolve();
                else
                    reject(new Error('La conversion du fichier RTF a échoué. Convertissez-le en .docx ou .txt.'));
            });
            process.on('error', (err) => {
                reject(new Error('La conversion du fichier RTF a échoué. Convertissez-le en .docx ou .txt.'));
            });
        });
        try {
            await fs.access(docxOutputPath);
        }
        catch {
            throw new Error('La conversion du fichier RTF a échoué. Convertissez-le en .docx ou .txt.');
        }
        const dataBuffer = await fs.readFile(docxOutputPath);
        const result = await mammoth.extractRawText({ buffer: dataBuffer });
        let text = result.value.trim();
        text = text.replace(/\r\n/g, '\n');
        text = text.replace(/\n{3,}/g, '\n\n');
        text = text.replace(/[^\S\n]+/g, ' ');
        if (text.length === 0) {
            throw new Error('Le fichier RTF a été converti, mais aucun texte exploitable n\'a été trouvé.');
        }
        await fs.rm(tempDir, { recursive: true, force: true });
        return { text };
    }
    catch (error) {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
        throw error;
    }
}
async function extractFromOdt(filePath) {
    // ODT files can be converted using LibreOffice similar to DOC
    const libreOfficeCommands = [
        'soffice',
        'libreoffice',
        '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    ];
    let libreOfficePath = null;
    for (const cmd of libreOfficeCommands) {
        try {
            await fs.access(cmd);
            libreOfficePath = cmd;
            break;
        }
        catch {
            continue;
        }
    }
    if (!libreOfficePath) {
        throw new Error('LibreOffice est nécessaire pour convertir les fichiers ODT. Installez LibreOffice ou convertissez le fichier en .docx ou .txt.');
    }
    const tempDir = path.join(UPLOAD_DIR, 'temp_conversion');
    await fs.mkdir(tempDir, { recursive: true });
    const docxOutputPath = path.join(tempDir, path.basename(filePath, '.odt') + '.docx');
    try {
        await new Promise((resolve, reject) => {
            const process = spawn(libreOfficePath, ['--headless', '--convert-to', 'docx', '--outdir', tempDir, filePath]);
            process.on('close', (code) => {
                if (code === 0)
                    resolve();
                else
                    reject(new Error('La conversion du fichier ODT a échoué. Convertissez-le en .docx ou .txt.'));
            });
            process.on('error', (err) => {
                reject(new Error('La conversion du fichier ODT a échoué. Convertissez-le en .docx ou .txt.'));
            });
        });
        try {
            await fs.access(docxOutputPath);
        }
        catch {
            throw new Error('La conversion du fichier ODT a échoué. Convertissez-le en .docx ou .txt.');
        }
        const dataBuffer = await fs.readFile(docxOutputPath);
        const result = await mammoth.extractRawText({ buffer: dataBuffer });
        let text = result.value.trim();
        text = text.replace(/\r\n/g, '\n');
        text = text.replace(/\n{3,}/g, '\n\n');
        text = text.replace(/[^\S\n]+/g, ' ');
        if (text.length === 0) {
            throw new Error('Le fichier ODT a été converti, mais aucun texte exploitable n\'a été trouvé.');
        }
        await fs.rm(tempDir, { recursive: true, force: true });
        return { text };
    }
    catch (error) {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
        throw error;
    }
}
async function extractFromMarkdown(filePath) {
    try {
        const text = await fs.readFile(filePath, 'utf-8');
        // Remove markdown syntax for plain text extraction
        let cleanText = text.trim();
        cleanText = cleanText.replace(/^#{1,6}\s+/gm, ''); // Remove headers
        cleanText = cleanText.replace(/\*\*([^*]+)\*\*/g, '$1'); // Remove bold
        cleanText = cleanText.replace(/\*([^*]+)\*/g, '$1'); // Remove italic
        cleanText = cleanText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove links
        cleanText = cleanText.replace(/```[\s\S]*?```/g, ''); // Remove code blocks
        cleanText = cleanText.replace(/`([^`]+)`/g, '$1'); // Remove inline code
        cleanText = cleanText.replace(/^[-*+]\s+/gm, ''); // Remove list markers
        cleanText = cleanText.replace(/^\d+\.\s+/gm, ''); // Remove numbered list markers
        cleanText = cleanText.trim();
        if (cleanText.length === 0) {
            throw new Error('Le fichier Markdown est vide.');
        }
        return { text: cleanText };
    }
    catch (error) {
        throw new Error('Impossible de lire ce fichier Markdown. Il est peut-être corrompu ou mal encodé.');
    }
}
async function extractFromDoc(filePath) {
    const libreOfficeCommands = [
        'soffice',
        'libreoffice',
        '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    ];
    let libreOfficePath = null;
    for (const cmd of libreOfficeCommands) {
        try {
            await fs.access(cmd);
            libreOfficePath = cmd;
            break;
        }
        catch {
            continue;
        }
    }
    if (!libreOfficePath) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Les anciens fichiers .doc ne sont pas pris en charge sur le serveur de production. Convertissez le fichier en .docx puis réessayez.');
        }
        throw new Error('LibreOffice est nécessaire pour convertir les anciens fichiers .doc. Installez LibreOffice ou importez une version .docx.');
    }
    console.log(`[extractFromDoc] LibreOffice trouvé: ${libreOfficePath}`);
    const tempDir = path.join(UPLOAD_DIR, 'temp_conversion');
    await fs.mkdir(tempDir, { recursive: true });
    const docxOutputPath = path.join(tempDir, path.basename(filePath, '.doc') + '.docx');
    console.log(`[extractFromDoc] Conversion: ${filePath} -> ${docxOutputPath}`);
    try {
        await new Promise((resolve, reject) => {
            const process = spawn(libreOfficePath, ['--headless', '--convert-to', 'docx', '--outdir', tempDir, filePath]);
            process.on('close', (code) => {
                console.log(`[extractFromDoc] Conversion terminée avec code: ${code}`);
                if (code === 0)
                    resolve();
                else
                    reject(new Error('La conversion du fichier .doc a échoué. Ouvrez-le avec Word ou LibreOffice puis enregistrez-le en .docx.'));
            });
            process.on('error', (err) => {
                console.error('[extractFromDoc] Erreur conversion:', err);
                reject(new Error('La conversion du fichier .doc a échoué. Ouvrez-le avec Word ou LibreOffice puis enregistrez-le en .docx.'));
            });
        });
        try {
            await fs.access(docxOutputPath);
        }
        catch {
            console.error('[extractFromDoc] Fichier converti non trouvé:', docxOutputPath);
            throw new Error('La conversion du fichier .doc a échoué. Ouvrez-le avec Word ou LibreOffice puis enregistrez-le en .docx.');
        }
        console.log(`[extractFromDoc] Extraction mammoth du fichier: ${docxOutputPath}`);
        const dataBuffer = await fs.readFile(docxOutputPath);
        const result = await mammoth.extractRawText({ buffer: dataBuffer });
        let text = result.value.trim();
        console.log(`[extractFromDoc] Texte extrait, longueur: ${text.length}`);
        // Clean up text artifacts
        text = text.replace(/\r\n/g, '\n');
        text = text.replace(/\n{3,}/g, '\n\n');
        text = text.replace(/[^\S\n]+/g, ' ');
        console.log(`[extractFromDoc] Texte nettoyé, longueur: ${text.length}`);
        if (text.length === 0) {
            console.error('[extractFromDoc] Texte vide après extraction');
            throw new Error('Le fichier .doc a été converti, mais aucun texte exploitable n\'a été trouvé.');
        }
        await fs.rm(tempDir, { recursive: true, force: true });
        return { text };
    }
    catch (error) {
        console.error('[extractFromDoc] Erreur:', error);
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
        throw error;
    }
}
export function saveDocument(document) {
    documents.set(document.id, document);
}
export function getDocument(id) {
    return documents.get(id);
}
export function getAllDocuments() {
    return Array.from(documents.values());
}
export function deleteDocument(id) {
    return documents.delete(id);
}
export function clearAllDocuments() {
    documents.clear();
}
export function searchInDocuments(query) {
    const results = [];
    const keywords = query.toLowerCase().split(' ');
    // Search through ALL documents and ALL lines to ensure full document coverage
    for (const [docId, doc] of documents) {
        const text = doc.content.toLowerCase();
        const lines = doc.content.split('\n');
        // Iterate through ALL lines to cover the entire document (including 243 pages)
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineLower = line.toLowerCase();
            let matchScore = 0;
            const matchedKeywords = [];
            // Check for keyword matches
            for (const keyword of keywords) {
                if (lineLower.includes(keyword)) {
                    matchScore += 1.5; // Higher weight for direct query matches
                    matchedKeywords.push(keyword);
                }
            }
            if (matchScore > 0) {
                const beforeContext = lines[Math.max(0, i - 2)];
                const afterContext = lines[Math.min(lines.length - 1, i + 2)];
                // Determine reason for relevance
                let reasonForRelevance = '';
                if (matchedKeywords.length > 0) {
                    reasonForRelevance = `Correspondance avec: ${matchedKeywords.slice(0, 3).join(', ')}`;
                    if (matchedKeywords.length > 3) {
                        reasonForRelevance += '...';
                    }
                }
                results.push({
                    keyword: query,
                    extract: lines[i],
                    beforeContext,
                    afterContext,
                    relevanceScore: matchScore / keywords.length,
                    documentId: docId,
                    documentName: doc.name,
                    page: doc.type === 'pdf' ? estimatePage(i, lines.length, doc.pages) : undefined,
                    reasonForRelevance
                });
            }
        }
    }
    // Sort by relevance score and deduplicate similar results
    return results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .filter((result, index, self) => index === self.findIndex(r => r.extract === result.extract));
}
// Estimate page number based on line position
function estimatePage(lineIndex, totalLines, totalPages) {
    if (!totalPages)
        return undefined;
    const linesPerPage = totalLines / totalPages;
    return Math.floor(lineIndex / linesPerPage) + 1;
}
export function countLines(text) {
    const lines = text.split('\n').filter(line => line.trim().length > 0).length;
    const words = text.split(/\s+/).filter(word => word.length > 0).length;
    const exceedsLimit = lines > 15;
    return { lines, words, exceedsLimit };
}
