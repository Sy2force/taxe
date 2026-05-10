import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { Document } from '../types';
import { searchConcepts, type TaxConcept } from './taxKnowledgeBase';

const documents: Map<string, Document> = new Map();
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

export async function ensureUploadDir(): Promise<void> {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function extractTextFromFile(file: any): Promise<{ text: string; pages?: number }> {
  const filePath = file.path;
  const extension = path.extname(file.originalname).toLowerCase();

  switch (extension) {
    case '.pdf':
      return await extractFromPDF(filePath);
    case '.docx':
      return await extractFromDocx(filePath);
    case '.doc':
      return await extractFromDoc(filePath);
    case '.txt':
      return await extractFromTxt(filePath);
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}

async function extractFromPDF(filePath: string): Promise<{ text: string; pages: number }> {
  console.log("UPLOAD_DEBUG - Extraction PDF", { filePath });
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    const text = data.text.trim();
    
    if (text.length === 0) {
      console.error("UPLOAD_DEBUG_ERROR - PDF texte vide ou scanné");
      throw new Error('Ce PDF semble être scanné ou composé d\'images. Aucun texte sélectionnable n\'a été trouvé. Utilisez un PDF texte ou ajoutez une fonction OCR.');
    }
    
    console.log("UPLOAD_DEBUG - PDF extrait avec succès", { textLength: text.length, pages: data.numpages });
    return { text, pages: data.numpages };
  } catch (error) {
    console.error("UPLOAD_DEBUG_ERROR - PDF parse échoué", error);
    throw new Error('Impossible de lire ce PDF. Il est peut-être protégé, corrompu ou mal encodé.');
  }
}

async function extractFromDocx(filePath: string): Promise<{ text: string }> {
  console.log("UPLOAD_DEBUG - Extraction DOCX", { filePath });
  try {
    const dataBuffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    const text = result.value.trim();
    
    if (text.length === 0) {
      console.error("UPLOAD_DEBUG_ERROR - DOCX texte vide");
      throw new Error('Le fichier DOCX a été ouvert, mais aucun texte exploitable n\'a été trouvé.');
    }
    
    console.log("UPLOAD_DEBUG - DOCX extrait avec succès", { textLength: text.length });
    return { text };
  } catch (error) {
    console.error("UPLOAD_DEBUG_ERROR - DOCX parse échoué", error);
    throw new Error('Impossible de lire ce fichier DOCX. Il est peut-être protégé ou corrompu.');
  }
}

async function extractFromTxt(filePath: string): Promise<{ text: string }> {
  console.log("UPLOAD_DEBUG - Extraction TXT", { filePath });
  try {
    const text = await fs.readFile(filePath, 'utf-8');
    const trimmedText = text.trim();
    
    if (trimmedText.length === 0) {
      console.error("UPLOAD_DEBUG_ERROR - TXT vide");
      throw new Error('Le fichier TXT est vide.');
    }
    
    console.log("UPLOAD_DEBUG - TXT extrait avec succès", { textLength: trimmedText.length });
    return { text: trimmedText };
  } catch (error) {
    console.error("UPLOAD_DEBUG_ERROR - TXT read échoué", error);
    throw new Error('Impossible de lire ce fichier TXT. Il est peut-être corrompu ou mal encodé.');
  }
}

async function extractFromDoc(filePath: string): Promise<{ text: string }> {
  console.log("UPLOAD_DEBUG - Extraction DOC", { filePath });
  
  // Try to find LibreOffice installation
  const libreOfficeCommands = [
    'soffice',
    'libreoffice',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  ];

  let libreOfficePath: string | null = null;
  for (const cmd of libreOfficeCommands) {
    try {
      await fs.access(cmd);
      libreOfficePath = cmd;
      console.log("UPLOAD_DEBUG - LibreOffice trouvé", { command: cmd });
      break;
    } catch {
      continue;
    }
  }

  if (!libreOfficePath) {
    console.error("UPLOAD_DEBUG_ERROR - LibreOffice non installé");
    throw new Error('LibreOffice est nécessaire pour convertir les anciens fichiers .doc. Installez LibreOffice ou importez une version .docx.');
  }

  // Create temporary directory for conversion
  const tempDir = path.join(UPLOAD_DIR, 'temp_conversion');
  await fs.mkdir(tempDir, { recursive: true });
  console.log("UPLOAD_DEBUG - Dossier temporaire créé", { tempDir });

  const docxOutputPath = path.join(tempDir, path.basename(filePath, '.doc') + '.docx');
  console.log("UPLOAD_DEBUG - Chemin de sortie DOCX", { docxOutputPath });

  try {
    // Convert .doc to .docx using LibreOffice
    console.log("UPLOAD_DEBUG - Début conversion LibreOffice", { 
      command: libreOfficePath,
      input: filePath,
      outputDir: tempDir
    });
    
    await new Promise<void>((resolve, reject) => {
      const process = spawn(libreOfficePath!, ['--headless', '--convert-to', 'docx', '--outdir', tempDir, filePath]);
      
      process.on('close', (code) => {
        if (code === 0) {
          console.log("UPLOAD_DEBUG - Conversion LibreOffice terminée", { code });
          resolve();
        } else {
          console.error("UPLOAD_DEBUG_ERROR - Conversion LibreOffice échouée", { code });
          reject(new Error('La conversion du fichier .doc a échoué. Ouvrez-le avec Word ou LibreOffice puis enregistrez-le en .docx.'));
        }
      });

      process.on('error', (err) => {
        console.error("UPLOAD_DEBUG_ERROR - Erreur processus LibreOffice", err);
        reject(new Error('La conversion du fichier .doc a échoué. Ouvrez-le avec Word ou LibreOffice puis enregistrez-le en .docx.'));
      });
    });

    // Check if conversion succeeded
    try {
      await fs.access(docxOutputPath);
      const stats = await fs.stat(docxOutputPath);
      console.log("UPLOAD_DEBUG - Fichier DOCX converti trouvé", { 
        path: docxOutputPath, 
        size: stats.size 
      });
    } catch {
      console.error("UPLOAD_DEBUG_ERROR - Fichier DOCX converti non trouvé");
      throw new Error('La conversion du fichier .doc a échoué. Ouvrez-le avec Word ou LibreOffice puis enregistrez-le en .docx.');
    }

    // Extract text from converted .docx
    const dataBuffer = await fs.readFile(docxOutputPath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    const text = result.value.trim();
    
    console.log("UPLOAD_DEBUG - Texte extrait du DOCX converti", { textLength: text.length });
    
    if (text.length === 0) {
      console.error("UPLOAD_DEBUG_ERROR - DOC converti mais texte vide");
      throw new Error('Le fichier .doc a été converti, mais aucun texte exploitable n\'a été trouvé.');
    }
    
    // Clean up temporary files
    await fs.rm(tempDir, { recursive: true, force: true });
    console.log("UPLOAD_DEBUG - Dossier temporaire nettoyé");
    
    return { text };
  } catch (error) {
    // Clean up temporary files on error
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    console.error("UPLOAD_DEBUG_ERROR - Erreur extraction DOC", error);
    throw error;
  }
}

export function saveDocument(document: Document): void {
  documents.set(document.id, document);
}

export function getDocument(id: string): Document | undefined {
  return documents.get(id);
}

export function getAllDocuments(): Document[] {
  return Array.from(documents.values());
}

export function deleteDocument(id: string): boolean {
  return documents.delete(id);
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
  matchedConcepts?: TaxConcept[];
  reasonForRelevance?: string;
}

export function searchInDocuments(query: string): SearchResult[] {
  const results: SearchResult[] = [];
  const keywords = query.toLowerCase().split(/\s+/);
  
  // Search for related tax concepts
  const relatedConcepts = searchConcepts(query);
  const conceptKeywords = new Set<string>();
  relatedConcepts.forEach(concept => {
    concept.motsClesFrancais.forEach(kw => conceptKeywords.add(kw.toLowerCase()));
    concept.motsClesHebreu.forEach(kw => conceptKeywords.add(kw.toLowerCase()));
  });

  // Search through ALL documents and ALL lines to ensure full document coverage
  for (const [docId, doc] of documents) {
    const text = doc.content.toLowerCase();
    const lines = doc.content.split('\n');

    // Iterate through ALL lines to cover the entire document (including 243 pages)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();
      let matchScore = 0;
      const matchedKeywords: string[] = [];

      // Check original query keywords
      for (const keyword of keywords) {
        if (lineLower.includes(keyword)) {
          matchScore += 1.5; // Higher weight for direct query matches
          matchedKeywords.push(keyword);
        }
      }

      // Check concept-related keywords
      for (const conceptKeyword of conceptKeywords) {
        if (lineLower.includes(conceptKeyword) && !matchedKeywords.includes(conceptKeyword)) {
          matchScore += 1; // Lower weight for concept matches
          matchedKeywords.push(conceptKeyword);
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
        if (relatedConcepts.length > 0) {
          const conceptNames = relatedConcepts.slice(0, 2).map(c => c.nomFrancais).join(', ');
          if (reasonForRelevance) {
            reasonForRelevance += `. Concepts liés: ${conceptNames}`;
          } else {
            reasonForRelevance = `Concepts liés: ${conceptNames}`;
          }
        }

        results.push({
          keyword: query,
          extract: lines[i],
          beforeContext,
          afterContext,
          relevanceScore: matchScore / (keywords.length + conceptKeywords.size),
          documentId: docId,
          documentName: doc.name,
          page: doc.type === 'pdf' ? estimatePage(i, lines.length, doc.pages) : undefined,
          matchedConcepts: relatedConcepts.length > 0 ? relatedConcepts.slice(0, 2) : undefined,
          reasonForRelevance
        });
      }
    }
  }

  // Sort by relevance score and deduplicate similar results
  return results
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .filter((result, index, self) => 
      index === self.findIndex(r => r.extract === result.extract)
    );
}

// Estimate page number based on line position
function estimatePage(lineIndex: number, totalLines: number, totalPages?: number): number | undefined {
  if (!totalPages) return undefined;
  const linesPerPage = totalLines / totalPages;
  return Math.floor(lineIndex / linesPerPage) + 1;
}

export function countLines(text: string): { lines: number; words: number; exceedsLimit: boolean } {
  const lines = text.split('\n').filter(line => line.trim().length > 0).length;
  const words = text.split(/\s+/).filter(word => word.length > 0).length;
  const exceedsLimit = lines > 15;
  return { lines, words, exceedsLimit };
}
