import { useState, useRef, useEffect } from 'react';
import { documentsApi, type Document } from '../lib/api';
import { Upload as UploadIcon, FileText, X, CheckCircle, AlertCircle, UploadCloud, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Upload() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [converting, setConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const docs = await documentsApi.getAll();
        setDocuments(docs);
        if (docs.length > 0) {
          setSuccess(true);
        }
      } catch (error) {
        console.error('Failed to load documents:', error);
      }
    };
    loadDocuments();
  }, []);

  if (uploading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-surface-card border border-border rounded-2xl p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              {converting ? 'Conversion du fichier Word .doc en cours...' : 'Import du document en cours...'}
            </h2>
            {converting && <p className="text-text-secondary text-sm mt-2">Cela peut prendre quelques secondes pour les fichiers .doc.</p>}
            <p className="text-text-secondary text-sm mt-2">Cela peut prendre quelques secondes pour un document de 243 pages.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check for allowed formats
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      setError('Format non supporté. Utilisez PDF, DOCX, DOC ou TXT.');
      return;
    }

    // Check if .doc file for conversion message
    if (fileExtension === '.doc') {
      setConverting(true);
    }

    setUploading(true);
    setError('');

    try {
      const uploadedDoc = await documentsApi.upload(file);
      setDocuments([...documents, uploadedDoc]);
      setError('');
      setSuccess(true);
    } catch (err: unknown) {
      console.error("Erreur import document:", err);
      if (err && typeof err === 'object' && 'response' in err) {
        const errorResponse = err as { response?: { data?: { error?: string } } };
        if (errorResponse.response?.data?.error) {
          setError(errorResponse.response.data.error);
        } else {
          setError('Impossible de lire ce document. Vérifiez que le fichier n\'est pas corrompu et réessayez.');
        }
      } else {
        setError('Impossible de lire ce document. Vérifiez que le fichier n\'est pas corrompu et réessayez.');
      }
    } finally {
      setUploading(false);
      setConverting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await documentsApi.delete(id);
      setDocuments(documents.filter((doc) => doc.id !== id));
    } catch (err) {
      setError('Erreur lors de la suppression du document');
      console.error(err);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];

      // Check for allowed formats
      const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedExtensions.includes(fileExtension)) {
        setError('Format non supporté. Utilisez PDF, DOCX, DOC ou TXT.');
        return;
      }

      // Check if .doc file for conversion message
      if (fileExtension === '.doc') {
        setConverting(true);
      }

      setUploading(true);
      setError('');

      documentsApi.upload(file)
        .then((uploadedDoc) => {
          setDocuments([...documents, uploadedDoc]);
          setSuccess(true);
        })
        .catch((err: unknown) => {
          console.error("Erreur import document (drag & drop):", err);
          if (err && typeof err === 'object' && 'response' in err) {
            const errorResponse = err as { response?: { data?: { error?: string } } };
            if (errorResponse.response?.data?.error) {
              setError(errorResponse.response.data.error);
            } else {
              setError('Impossible de lire ce document. Vérifiez que le fichier n\'est pas corrompu et réessayez.');
            }
          } else {
            setError('Impossible de lire ce document. Vérifiez que le fichier n\'est pas corrompu et réessayez.');
          }
        })
        .finally(() => {
          setUploading(false);
          setConverting(false);
        });
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">Étape 1/4</span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Import du document principal</h1>
          <p className="text-text-secondary">
            Importez le PDF de lois fiscales (243 pages) qui servira de référence pour tout le devoir.
          </p>
        </div>

        {/* Upload Section */}
        {documents.length === 0 && (
          <div className="mb-8">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 transition-all ${
                dragActive
                  ? 'border-blue-400 bg-blue-500/5'
                  : 'border-border bg-surface-card hover:border-blue-500/50 hover:bg-surface-cardHover'
              }`}
            >
              <div className="flex flex-col items-center">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all ${
                  dragActive ? 'bg-blue-500/20 scale-110' : 'bg-blue-500/10'
                }`}>
                  <UploadCloud className={`h-10 w-10 ${dragActive ? 'text-blue-400' : 'text-blue-400'}`} />
                </div>
                <p className="text-xl font-semibold text-text-primary mb-2">
                  Glissez-déposez votre document de lois fiscales
                </p>
                <p className="text-sm text-text-secondary mb-6">
                  Formats acceptés : PDF, DOCX, DOC, TXT (recommandé : 243 pages)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.txt,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain"
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all cursor-pointer shadow-lg hover:shadow-glow"
                >
                  <UploadIcon className="h-5 w-5" />
                  Sélectionner un document
                </label>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Success State */}
        {success && documents.length > 0 && (
          <div className="mb-8 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle size={32} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-emerald-400 mb-1">Document prêt</h2>
                <p className="text-text-secondary">Le document principal a été importé avec succès.</p>
              </div>
            </div>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-surface-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{doc.name}</p>
                        <p className="text-sm text-text-secondary">
                          {doc.type.toUpperCase()} {doc.pages && `• ${doc.pages} pages`} • {doc.content.length.toLocaleString()} caractères extraits
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <X className="h-5 w-5 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <p className="text-text-secondary text-sm">
                Vous pouvez maintenant ajouter les questions du devoir.
              </p>
              <Link
                to="/homework"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all"
              >
                Continuer
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
