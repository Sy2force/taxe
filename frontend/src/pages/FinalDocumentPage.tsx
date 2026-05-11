import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionContext } from '../contexts/SessionContext';
import { Upload, CheckCircle, AlertCircle, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';

export default function FinalDocumentPage() {
  const navigate = useNavigate();
  const { sessionData, uploadFinalDocument, isReadOnly, backendOnline } = useSessionContext();
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fileInfo, setFileInfo] = useState<{ name: string; chars: number; answersDetected: number } | null>(null);
  const [warning, setWarning] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const finalDocument = sessionData?.documents?.find((d: any) => d.type === 'final');
  const studentAnswers = sessionData?.answers?.filter((a: any) => a.status === 'completed') || [];

  const handleUpload = async (f: File) => {
    setUploading(true);
    setStatus('idle');
    setErrorMsg('');
    setWarning('');
    try {
      // Use SessionContext to upload to backend (ensureSession is called internally)
      await uploadFinalDocument(f);
      const data = sessionData?.documents?.find((d: any) => d.type === 'final');
      if (!data) {
        throw new Error('Le document n\'a pas pu être sauvegardé.');
      }
      setFileInfo({
        name: f.name,
        chars: data.character_count,
        answersDetected: studentAnswers.length
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
        answersDetected: studentAnswers.length
      });
      setStatus('success');
    }
  }, [finalDocument, studentAnswers]);

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
            Étape 4
          </div>
          <div className="flex items-center gap-2">
            {backendOnline ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>
                <CheckCircle className="w-3.5 h-3.5" /> En ligne
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                <AlertCircle className="w-3.5 h-3.5" /> Hors ligne
              </div>
            )}
          </div>
        </div>
        <h1 className="text-[26px] font-bold text-text-primary tracking-tight mb-2">
          Document complété
        </h1>
        <p className="text-[14px] text-text-tertiary leading-relaxed max-w-xl">
          Importez le fichier contenant vos réponses complètes pour obtenir une correction basée sur le document de lois.
        </p>
      </div>

      {/* Upload Zone */}
      {status !== 'success' && !isReadOnly && (
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
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="rounded-xl p-4 mb-6 flex items-start gap-3"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-[13px] text-red-300">{errorMsg}</p>
        </div>
      )}

      {/* Warning */}
      {warning && (
        <div className="rounded-xl p-4 mb-6 flex items-start gap-3"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <p className="text-[13px] text-yellow-300">{warning}</p>
        </div>
      )}

      {/* Success */}
      {status === 'success' && fileInfo && (
        <div className="rounded-xl p-6 mb-6"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-[14px] font-medium text-green-300">Document importé avec succès</p>
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
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/answers')}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-medium text-text-tertiary hover:text-text-secondary transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <ArrowLeft className="w-4 h-4" /> Suggestions
        </button>
        {status === 'success' && !isReadOnly && (
          <button onClick={() => navigate('/verification')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 0 0 1px rgba(16,185,129,0.3), 0 4px 16px rgba(16,185,129,0.25)' }}>
            Corriger le document <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
