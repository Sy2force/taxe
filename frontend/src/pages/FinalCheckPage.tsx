import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileCheck, Loader2, AlertCircle, CheckCircle, XCircle,
  Copy, ChevronLeft, Download, Zap, BookOpen,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5050';

interface QAPair {
  questionId: number;
  question: string;
  answer: string;
}

interface Source {
  extract: string;
  page?: number;
  documentName: string;
}

interface CheckResult {
  questionId: number;
  question: string;
  answer: string;
  score: number;
  status: 'ready' | 'needs_improvement' | 'no_source' | 'incomplete';
  sources: Source[];
  corrections: string[];
  improved: string;
  details: {
    hasSource: boolean;
    hasRule: boolean;
    hasConclusion: boolean;
    hasCalculation: boolean;
    hasFacts: boolean;
    isOnTopic: boolean;
    lines: number;
    tooLong: boolean;
  };
}

interface CheckReport {
  globalStatus: string;
  avgScore: number;
  total: number;
  ready: number;
  needsImprovement: number;
  noSource: number;
  incomplete: number;
  results: CheckResult[];
}

const statusConfig = {
  ready: { label: 'Prête', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25', icon: CheckCircle },
  needs_improvement: { label: 'À corriger', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/25', icon: AlertCircle },
  no_source: { label: 'Source manquante', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/25', icon: AlertCircle },
  incomplete: { label: 'Incomplet', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/25', icon: XCircle },
};

function scoreHex(s: number) {
  if (s >= 80) return '#34d399';
  if (s >= 60) return '#fbbf24';
  if (s >= 40) return '#fb923c';
  return '#f87171';
}

// Extract question/answer pairs from raw text
function extractPairs(text: string): QAPair[] {
  const pairs: QAPair[] = [];
  // Split on question markers: "Question 1", "1.", "שאלה 1", etc.
  const blocks = text.split(/(?=(?:question\s*\d+|שאלה\s*\d+|\d+[.)]\s+\S))/i);

  let id = 1;
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    // First line(s) = question, rest = answer
    // Find where the answer starts (after a blank line or "Réponse :" marker)
    let qLines: string[] = [];
    let aLines: string[] = [];
    let inAnswer = false;

    for (const line of lines) {
      if (/^réponse\s*[:：]/i.test(line)) {
        inAnswer = true;
        const rest = line.replace(/^réponse\s*[:：]/i, '').trim();
        if (rest) aLines.push(rest);
      } else if (inAnswer) {
        aLines.push(line);
      } else {
        qLines.push(line);
      }
    }

    // If no explicit "Réponse:" marker, split in half
    if (aLines.length === 0 && qLines.length >= 4) {
      const mid = Math.ceil(qLines.length / 3);
      aLines = qLines.slice(mid);
      qLines = qLines.slice(0, mid);
    }

    const question = qLines.join(' ').trim();
    const answer = aLines.join('\n').trim();

    if (question.length > 10) {
      pairs.push({ questionId: id++, question, answer });
    }
  }

  return pairs;
}

export default function FinalCheckPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [fileName, setFileName] = useState('');
  const [pairs, setPairs] = useState<QAPair[]>([]);
  const [checking, setChecking] = useState(false);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [checkError, setCheckError] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<Record<number, string>>({});
  const [allCopied, setAllCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleUpload = async (f: File) => {
    setUploading(true);
    setUploadError('');
    setReport(null);
    setPairs([]);
    try {
      const formData = new FormData();
      formData.append('file', f);
      const res = await fetch(`${API}/api/upload-final-document`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'import');
      setFileName(f.name);
      const detected = extractPairs(data.content || '');
      setPairs(detected);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleUpload(f);
  };

  const handleCheck = async () => {
    if (pairs.length === 0) return;
    setChecking(true);
    setCheckError('');
    setReport(null);
    try {
      const res = await fetch(`${API}/api/final-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la vérification');
      setReport(data);
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : 'Erreur lors de la vérification');
    } finally {
      setChecking(false);
    }
  };

  const copyText = async (text: string, key: number, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopyFeedback(prev => ({ ...prev, [key]: label }));
    setTimeout(() => setCopyFeedback(prev => { const n = { ...prev }; delete n[key]; return n; }), 2500);
  };

  const exportReport = () => {
    if (!report) return;
    const lines: string[] = [
      'RAPPORT DE VÉRIFICATION FINALE',
      '================================',
      `Statut global : ${report.globalStatus}`,
      `Score moyen : ${report.avgScore}/100`,
      `Questions : ${report.total} total, ${report.ready} prêtes, ${report.needsImprovement} à corriger, ${report.noSource} sans source, ${report.incomplete} incomplètes`,
      '',
      ...report.results.flatMap(r => [
        `Question ${r.questionId} — Score : ${r.score}/100 — ${statusConfig[r.status].label}`,
        `Question : ${r.question}`,
        `Réponse : ${r.answer}`,
        r.corrections.length > 0 ? `Corrections :\n${r.corrections.map(c => `  - ${c}`).join('\n')}` : '',
        r.sources.length > 0 ? `Sources :\n${r.sources.map(s => `  - ${s.documentName}${s.page ? `, page ${s.page}` : ''} : ${s.extract.substring(0, 100)}...`).join('\n')}` : '  Aucune source trouvée.',
        '---',
        '',
      ]),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rapport-verification-finale.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyAllCorrections = async () => {
    if (!report) return;
    const text = report.results
      .filter(r => r.corrections.length > 0)
      .map(r => `Question ${r.questionId} :\n${r.corrections.map(c => `- ${c}`).join('\n')}`)
      .join('\n\n');
    await navigator.clipboard.writeText(text || 'Aucune correction nécessaire.');
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2500);
  };

  const isHebrew = (t: string) => /[\u0590-\u05FF]/.test(t);

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-3xl mx-auto">

      {/* Page header */}
      <div className="mb-8">
        <div className="inline-flex items-center px-3 py-1.5 rounded-full mb-4 text-[11px] font-semibold uppercase tracking-widest"
          style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#fda4af' }}>
          Étape 5
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold text-text-primary tracking-tight mb-1">Document final</h1>
            <p className="text-[13px] text-text-tertiary max-w-sm leading-relaxed">
              Importez votre devoir complété pour vérifier chaque réponse contre le document de lois.
            </p>
          </div>
          <button onClick={() => navigate('/verification')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium text-text-tertiary hover:text-text-secondary transition-colors flex-shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <ChevronLeft className="w-3.5 h-3.5" /> Vérification
          </button>
        </div>
      </div>

      {/* ── Upload zone ── */}
      {!fileName && (
        <div
          onDrop={handleDrop} onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="relative rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 mb-6 group"
          style={{
            background: uploading ? 'rgba(244,63,94,0.06)' : 'rgba(24,24,27,0.6)',
            border: uploading ? '1.5px dashed rgba(244,63,94,0.4)' : '1.5px dashed rgba(255,255,255,0.08)',
          }}
          onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLElement).style.border = '1.5px dashed rgba(244,63,94,0.3)'; }}
          onMouseLeave={e => { if (!uploading) (e.currentTarget as HTMLElement).style.border = '1.5px dashed rgba(255,255,255,0.08)'; }}
        >
          <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden"
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.22)' }}>
                <Loader2 className="w-6 h-6 text-rose-400 animate-spin" />
              </div>
              <p className="text-[14px] font-medium text-text-secondary">Lecture du document final…</p>
              <p className="text-[12px] text-text-muted">Extraction et analyse des paires question/réponse</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105"
                style={{ background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Upload className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-text-secondary">
                  Glissez votre document ou <span className="text-rose-400">cliquez pour importer</span>
                </p>
                <p className="text-[12px] text-text-muted mt-1">PDF · DOCX · DOC · TXT — document avec 8 questions + réponses</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!fileName && !uploadError && !uploading && (
        <div className="text-center py-8">
          <FileCheck className="w-10 h-10 mx-auto mb-3 text-zinc-800" />
          <p className="text-[13px] text-text-muted">Le document doit contenir les questions numérotées avec les réponses.</p>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="flex items-start gap-3 p-4 rounded-2xl mb-6"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-medium text-red-400 mb-0.5">Erreur d'import</p>
            <p className="text-[12px] text-red-400/70">{uploadError}</p>
          </div>
          <button onClick={() => { setUploadError(''); setFileName(''); }}
            className="text-[11px] text-red-400/60 hover:text-red-400 underline">Réessayer</button>
        </div>
      )}

      {/* ── File loaded — pairs preview ── */}
      {fileName && !report && (
        <div className="mb-6">
          {/* File card */}
          <div className="flex items-center gap-3 p-4 rounded-2xl mb-4"
            style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <FileCheck className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-text-primary tracking-tight truncate">{fileName}</p>
              <p className="text-[11px] text-text-muted mt-0.5">{pairs.length} paire(s) détectée(s)</p>
            </div>
            <button onClick={() => { setFileName(''); setPairs([]); }}
              className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">Changer</button>
          </div>

          {pairs.length === 0 ? (
            <div className="flex items-start gap-2.5 p-4 rounded-2xl"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-amber-400/90">
                Aucune paire détectée. Assurez-vous que le document contient des questions numérotées avec <strong>"Réponse :"</strong> sous chaque question.
              </p>
            </div>
          ) : (
            <>
              {pairs.length !== 8 && (
                <div className="flex items-start gap-2 p-3 rounded-xl mb-4"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-amber-400/90">
                    {pairs.length < 8 ? `${pairs.length} paires détectées (attendu 8). Vérifiez la structure.` : `${pairs.length} paires détectées — vérifiez le découpage.`}
                  </p>
                </div>
              )}

              {/* Pairs list */}
              <div className="space-y-2 mb-5">
                {pairs.map(p => (
                  <div key={p.questionId} className="flex items-start gap-3 p-4 rounded-2xl"
                    style={{ background: 'rgba(24,24,27,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 tabular-nums"
                      style={{ background: 'rgba(244,63,94,0.12)', color: '#fda4af', border: '1px solid rgba(244,63,94,0.2)' }}>
                      {p.questionId}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] text-text-secondary leading-relaxed ${isHebrew(p.question) ? 'text-right' : ''}`}
                        dir={isHebrew(p.question) ? 'rtl' : 'ltr'}>
                        {p.question.substring(0, 100)}{p.question.length > 100 ? '…' : ''}
                      </p>
                      {p.answer ? (
                        <p className="text-[11px] text-text-muted mt-1 line-clamp-2">{p.answer.substring(0, 120)}…</p>
                      ) : (
                        <p className="text-[11px] text-amber-500/70 mt-1 italic">Aucune réponse détectée</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="flex justify-end">
                <button onClick={handleCheck} disabled={checking}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg,#f43f5e,#e11d48)', boxShadow: '0 0 0 1px rgba(244,63,94,0.3), 0 4px 16px rgba(244,63,94,0.25)' }}>
                  {checking
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Vérification…</>
                    : <><Zap className="w-4 h-4" /> Lancer la vérification finale</>}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Check error */}
      {checkError && (
        <div className="flex items-start gap-3 p-4 rounded-2xl mb-6"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-red-400">{checkError}</p>
        </div>
      )}

      {/* ── Report ── */}
      {report && (
        <>
          {/* Global summary card */}
          <div className="rounded-2xl p-5 mb-5" style={{ background: 'rgba(24,24,27,0.85)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[15px] font-bold text-text-primary tracking-tight">{report.globalStatus}</p>
                <p className="text-[11px] text-text-muted mt-0.5">{report.total} question(s) analysée(s)</p>
              </div>
              <div className="text-right">
                <p className="text-[32px] font-bold leading-none tracking-tight tabular-nums" style={{ color: scoreHex(report.avgScore) }}>
                  {report.avgScore}
                  <span className="text-[16px] text-text-muted font-normal">/100</span>
                </p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">Score moyen</p>
              </div>
            </div>

            {/* Score bar */}
            <div className="h-1.5 rounded-full mb-4 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${report.avgScore}%`,
                  background: report.avgScore >= 80 ? 'linear-gradient(90deg,#10b981,#34d399)'
                    : report.avgScore >= 60 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                    : 'linear-gradient(90deg,#ef4444,#f87171)',
                }} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Prêtes',      val: report.ready,             c: '#34d399', bg: 'rgba(16,185,129,0.08)',  b: 'rgba(16,185,129,0.2)' },
                { label: 'À corriger', val: report.needsImprovement,  c: '#fbbf24', bg: 'rgba(245,158,11,0.08)',  b: 'rgba(245,158,11,0.2)' },
                { label: 'Sans source',val: report.noSource,           c: '#fb923c', bg: 'rgba(249,115,22,0.08)',  b: 'rgba(249,115,22,0.2)' },
                { label: 'Incomplètes',val: report.incomplete,         c: '#f87171', bg: 'rgba(239,68,68,0.08)',   b: 'rgba(239,68,68,0.2)' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.bg, border: `1px solid ${s.b}` }}>
                  <p className="text-[18px] font-bold tabular-nums" style={{ color: s.c }}>{s.val}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <button onClick={copyAllCorrections}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
                style={allCopied
                  ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }
                  : { background: 'rgba(39,39,42,0.6)', border: '1px solid rgba(255,255,255,0.07)', color: '#71717a' }}>
                <Copy className="w-3.5 h-3.5" />{allCopied ? 'Copié !' : 'Copier les corrections'}
              </button>
              <button onClick={exportReport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors"
                style={{ background: 'rgba(39,39,42,0.6)', border: '1px solid rgba(255,255,255,0.07)', color: '#71717a' }}>
                <Download className="w-3.5 h-3.5" /> Exporter .txt
              </button>
              <button onClick={() => { setReport(null); setFileName(''); setPairs([]); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors ml-auto"
                style={{ background: 'rgba(39,39,42,0.6)', border: '1px solid rgba(255,255,255,0.07)', color: '#71717a' }}>
                <Upload className="w-3.5 h-3.5" /> Nouveau document
              </button>
            </div>
          </div>

          {/* Per-question results */}
          <div className="space-y-3">
            {report.results.map(r => {
              const cfg = statusConfig[r.status];
              const StatusIcon = cfg.icon;
              return (
                <div key={r.questionId} className="rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(24,24,27,0.75)', border: '1px solid rgba(255,255,255,0.07)' }}>

                  {/* Question header row */}
                  <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold flex-shrink-0 tabular-nums"
                      style={{ background: 'rgba(244,63,94,0.12)', color: '#fda4af', border: '1px solid rgba(244,63,94,0.2)' }}>
                      {r.questionId}
                    </span>
                    <p className={`flex-1 text-[12px] text-text-secondary leading-relaxed truncate ${isHebrew(r.question) ? 'text-right' : ''}`}
                      dir={isHebrew(r.question) ? 'rtl' : 'ltr'}>
                      {r.question.substring(0, 80)}{r.question.length > 80 ? '…' : ''}
                    </p>
                    {/* Score */}
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[14px] font-bold tabular-nums"
                          style={{ color: r.score >= 80 ? '#34d399' : r.score >= 60 ? '#fbbf24' : r.score >= 40 ? '#fb923c' : '#f87171' }}>
                          {r.score}<span className="text-[10px] text-text-muted font-normal">/100</span>
                        </span>
                        <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-full rounded-full"
                            style={{
                              width: `${r.score}%`,
                              background: r.score >= 80 ? '#10b981' : r.score >= 60 ? '#f59e0b' : r.score >= 40 ? '#f97316' : '#ef4444',
                            }} />
                        </div>
                      </div>
                      <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg ${cfg.color}`}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <StatusIcon className="w-3 h-3" />{cfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-4 py-4 space-y-3">
                    {/* Check pills */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {[
                        { label: 'Sujet',       val: r.details.isOnTopic },
                        { label: 'Faits',        val: r.details.hasFacts },
                        { label: 'Règle',        val: r.details.hasRule },
                        { label: 'Source',       val: r.details.hasSource },
                        { label: 'Calcul',       val: r.details.hasCalculation },
                        { label: 'Conclusion',   val: r.details.hasConclusion },
                      ].map(item => (
                        <span key={item.label} className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg"
                          style={item.val
                            ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#6ee7b7' }
                            : { background: 'rgba(39,39,42,0.5)', border: '1px solid rgba(255,255,255,0.06)', color: '#52525b' }}>
                          {item.val
                            ? <CheckCircle className="w-3 h-3" />
                            : <XCircle className="w-3 h-3" />}
                          {item.label}
                        </span>
                      ))}
                    </div>

                    {/* Corrections */}
                    {r.corrections.length > 0 && (
                      <div className="p-3.5 rounded-xl space-y-1.5"
                        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                        <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mb-2">Corrections</p>
                        {r.corrections.map((c, i) => (
                          <p key={i} className="flex items-start gap-2 text-[12px] text-text-secondary leading-relaxed">
                            <span className="text-amber-500 flex-shrink-0 mt-0.5">›</span>{c}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Sources */}
                    {r.sources.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> Sources du document de lois
                        </p>
                        {r.sources.slice(0, 2).map((s, i) => (
                          <div key={i} className="px-3 py-2.5 rounded-xl"
                            style={{ background: 'rgba(9,9,11,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-semibold text-indigo-400">{s.documentName}</span>
                              {s.page && <span className="text-[10px] text-text-muted">p. {s.page}</span>}
                            </div>
                            <p className="text-[11px] text-text-tertiary leading-relaxed line-clamp-2">{s.extract}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {r.sources.length === 0 && (
                      <div className="flex items-center gap-2 p-3 rounded-xl"
                        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <p className="text-[12px] text-amber-400/80">Aucune source trouvée dans le document de lois.</p>
                      </div>
                    )}

                    {/* Copy correction */}
                    <div className="flex justify-end pt-1">
                      <button onClick={() => copyText(
                        `Q${r.questionId} — ${r.score}/100\n${r.corrections.length > 0 ? r.corrections.map(c => `• ${c}`).join('\n') : 'Aucune correction.'}`,
                        r.questionId, 'Copié !'
                      )}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                        style={copyFeedback[r.questionId]
                          ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }
                          : { background: 'rgba(39,39,42,0.6)', border: '1px solid rgba(255,255,255,0.06)', color: '#71717a' }}>
                        <Copy className="w-3 h-3" />{copyFeedback[r.questionId] || 'Copier la correction'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 py-4 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[11px] text-text-muted">
              Rapport basé uniquement sur le document de lois — reformulez les corrections avant soumission finale.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
