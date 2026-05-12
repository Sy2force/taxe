import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionContext } from '../contexts/SessionContext';
import { Upload, CheckCircle, AlertCircle, Loader2, ChevronRight, ArrowLeft, FileText, Sparkles } from 'lucide-react';

export default function FinalDocumentPage() {
  const navigate = useNavigate();
  const { sessionData, uploadFinalDocument, saveUserAnswer } = useSessionContext();
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fileInfo, setFileInfo] = useState<{ name: string; chars: number; answersDetected: number } | null>(null);
  const [useGenerated, setUseGenerated] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState<{ questionId: string; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const finalDocument = sessionData?.documents?.find((d: any) => d.type === 'final');
  const answers = sessionData?.answers || [];
  const questions = sessionData?.questions || [];
  const hasAnswers = answers.length > 0 && answers.some((a: any) => a.suggested_answer || a.user_answer);
  const hasGeneratedAnswers = answers.some((a: any) => a.suggested_answer && a.status === 'generated');

  const handleUpload = async (f: File) => {
    setUploading(true);
    setStatus('idle');
    setErrorMsg('');
    try {
      await uploadFinalDocument(f);
      const data = sessionData?.documents?.find((d: any) => d.type === 'final');
      if (!data) {
        throw new Error('Le document n\'a pas pu être sauvegardé.');
      }
      setFileInfo({
        name: f.name,
        chars: data.character_count,
        answersDetected: answers.length
      });
      setStatus('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Upload error:', err);
      setErrorMsg(errorMessage);
      setStatus('error');
    } finally {
      setUploading(false);
    }
  };

  const handleUseGenerated = () => {
    setUseGenerated(true);
    setStatus('success');
    setFileInfo({
      name: 'Réponses générées par IA',
      chars: answers.reduce((sum: number, a: any) => sum + (a.suggested_answer?.length || 0), 0),
      answersDetected: answers.length
    });
  };

  const handleSaveAnswer = async (questionId: string, text: string) => {
    try {
      await saveUserAnswer(questionId, text);
      setEditingAnswer(null);
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleUpload(f);
  };

  useEffect(() => {
    if (finalDocument) {
      setFileInfo({
        name: finalDocument.filename,
        chars: finalDocument.character_count,
        answersDetected: answers.length
      });
      setStatus('success');
    }
  }, [finalDocument, answers]);

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-3xl mx-auto">
      {/* Workflow guard: answers not generated */}
      {!hasAnswers && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <AlertCircle className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-[18px] font-semibold text-text-primary mb-2">Suggestions non générées</h2>
          <p className="text-[13px] text-text-tertiary mb-6">Générez d'abord les suggestions de réponses basées sur les lois fiscales.</p>
          <button onClick={() => navigate('/answers')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
            Générer les suggestions
          </button>
        </div>
      )}

      {/* Page header */}
      {hasAnswers && (
      <>
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-[11px] font-semibold uppercase tracking-widest"
          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
          Étape 4
        </div>
        <h1 className="text-[26px] font-bold text-text-primary tracking-tight mb-2">Document complété</h1>
        <p className="text-[14px] text-text-tertiary leading-relaxed max-w-xl">
          Importez le fichier contenant vos réponses complètes pour obtenir une correction basée sur le document de lois.
        </p>
      </div>

      {/* Upload Zone */}
      {status !== 'success' && (
        <>
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="relative rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 mb-6 group"
          style={{
            background: uploading ? 'rgba(99,102,241,0.06)' : 'rgba(24,24,27,0.6)',
            border: uploading ? '1.5px dashed rgba(99,102,241,0.4)' : '1.5px dashed rgba(255,255,255,0.08)',
          }}
          onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLElement).style.border = '1.5px dashed rgba(99,102,241,0.35)'; }}
          onMouseLeave={e => { if (!uploading) (e.currentTarget as HTMLElement).style.border = '1.5px dashed rgba(255,255,255,0.08)'; }}
        >
          <input ref={fileRef} type="file" accept=".pdf" className="hidden"
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
              <p className="text-[13px] text-text-secondary">Import en cours...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <Upload className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-text-primary mb-1">Glissez votre fichier ici</p>
                <p className="text-[12px] text-text-tertiary">ou cliquez pour sélectionner</p>
              </div>
              <p className="text-[11px] text-text-tertiary">PDF uniquement</p>
            </div>
          )}
        </div>

        {/* Option to use generated answers */}
        {hasGeneratedAnswers && (
          <div className="rounded-2xl p-6 mb-6"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <p className="text-[14px] font-medium text-emerald-300">Réponses générées disponibles</p>
            </div>
            <p className="text-[12px] text-emerald-400/70 mb-4">
              Vous pouvez utiliser les suggestions générées par l'IA comme point de départ pour votre devoir.
            </p>
            <button onClick={handleUseGenerated}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}>
              <FileText className="w-4 h-4" /> Utiliser les réponses générées
            </button>
          </div>
        )}
        </>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="rounded-xl p-4 mb-6 flex items-start gap-3"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-[13px] text-red-300">{errorMsg}</p>
        </div>
      )}

      {/* Success */}
      {status === 'success' && fileInfo && (
        <>
        <div className="rounded-xl p-6 mb-6"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-[14px] font-medium text-green-300">Réponses prêtes pour correction</p>
          </div>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-text-tertiary">Fichier:</span>
              <span className="text-text-primary">{fileInfo.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">Caractères:</span>
              <span className="text-text-primary">{fileInfo.chars.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">Réponses détectées:</span>
              <span className="text-text-primary">{fileInfo.answersDetected}</span>
            </div>
          </div>
        </div>

        {/* Answers editing interface when using generated answers */}
        {useGenerated && questions.length > 0 && (
          <div className="space-y-4 mb-6">
            {questions.map((q: any) => {
              const answer = answers.find((a: any) => a.question_id === q.id);
              const currentAnswer = answer?.user_answer || answer?.suggested_answer || '';
              const isEditing = editingAnswer?.questionId === q.id;
              
              return (
                <div key={q.id} className="rounded-xl p-4" style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="mb-3">
                    <p className="text-[11px] font-medium text-text-tertiary mb-1">Question {q.number}</p>
                    <p className="text-[13px] text-text-primary leading-relaxed" dir="rtl">{q.original_hebrew || q.originalText}</p>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-[11px] font-medium text-text-tertiary mb-1">Réponse actuelle:</p>
                    {isEditing ? (
                      <textarea
                        value={editingAnswer?.text || currentAnswer}
                        onChange={e => setEditingAnswer({ questionId: q.id, text: e.target.value })}
                        rows={6}
                        dir="rtl"
                        className="w-full bg-zinc-950/60 text-[13px] text-text-primary p-3 rounded-lg focus:outline-none resize-none leading-relaxed"
                      />
                    ) : (
                      <p className="text-[13px] text-text-secondary leading-relaxed" dir="rtl">{currentAnswer || 'Non renseignée'}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <button onClick={() => handleSaveAnswer(q.id, editingAnswer?.text || currentAnswer)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }}>
                          Sauvegarder
                        </button>
                        <button onClick={() => setEditingAnswer(null)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                          style={{ background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}>
                          Annuler
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setEditingAnswer({ questionId: q.id, text: currentAnswer })}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
                        Modifier
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/answers')}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-medium text-text-tertiary hover:text-text-secondary transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <ArrowLeft className="w-4 h-4" /> Suggestions
        </button>
        {status === 'success' && (
          <button onClick={() => navigate('/verification')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
            Continuer vers Correction
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
      </>
      )}
    </div>
  );
}
