# Correcteur Fiscalité Pro

Assistant de correction et de recherche pour devoir de fiscalité des sociétés.

## 📋 Description

Cette application aide une étudiante à travailler sur un devoir de fiscalité des sociétés. Elle permet d'importer des documents (PDF de lois fiscales, sujet du devoir, réponses personnelles), de rechercher des mots-clés dans les sources, d'analyser des questions et de corriger des réponses.

### Fonctionnalités principales

- **Import de documents** : PDF, DOCX, DOC, TXT
- **Recherche intelligente** : Mots-clés hébreux et français dans les documents
- **Analyse de questions** : Structure conseillée, faits à repérer, règles à vérifier
- **Correcteur de réponses** : Grille d'évaluation complète avec score
- **Mode sans API** : Fonctionne entièrement en local
- **Mode IA optionnel** : Intégration OpenAI GPT-4 (optionnel)
- **Limite de 15 lignes** : Compteur de lignes et avertissements
- **Déclaration IA** : Générateur de déclaration d'utilisation de l'IA

### Règles éthiques

⚠️ **Important** : Cet outil aide à comprendre, structurer et corriger. Il ne remplace pas le travail personnel de l'étudiante.

- L'outil ne rédige pas le devoir à la place
- Il ne donne pas de réponses finales complètes
- Il n'invente pas d'articles ou de références
- Il encourage l'étudiante à rédiger avec ses propres mots
- Il indique toujours les sources à vérifier

## 🛠️ Stack Technique

### Backend
- Node.js + Express + TypeScript
- Multer pour l'upload de fichiers
- pdf-parse pour la lecture des PDF
- mammoth pour la lecture des fichiers Word .docx
- OpenAI API (optionnel)

### Frontend
- React + Vite + TypeScript
- Tailwind CSS
- Framer Motion (animations)
- Lucide React (icônes)
- React Router (routing)
- Axios (appels API)

## 📦 Installation

### Prérequis
- Node.js (v18 ou supérieur)
- npm ou yarn
- LibreOffice (optionnel, pour le support des fichiers .doc)

### Installation de LibreOffice (optionnel)

Pour supporter les anciens fichiers Word (.doc), LibreOffice doit être installé sur la machine.

**macOS :**
```bash
brew install --cask libreoffice
```

Vérifier l'installation :
```bash
/Applications/LibreOffice.app/Contents/MacOS/soffice --version
```

Ou :
```bash
soffice --version
```

**Si LibreOffice n'est pas installé :**
Le système affichera un message clair demandant d'installer LibreOffice ou d'importer le fichier en .docx.

### Installation des dépendances

```bash
# Installer toutes les dépendances (recommandé)
npm run install:all

# Ou manuellement :
npm install
cd backend
npm install
cd ../frontend
npm install
```

### Configuration

Créer un fichier `.env` dans le dossier `backend` :

```bash
cd backend
cp .env.example .env
```

Éditez `backend/.env` si nécessaire :

```env
PORT=5050
OPENAI_API_KEY=  # Laissez vide pour le mode sans IA
```

Créer un fichier `.env` dans le dossier `frontend` :

```bash
cd frontend
cp .env.example .env
```

Éditez `frontend/.env` si nécessaire :

```env
VITE_API_URL=http://localhost:5050
```

**Note** : Si aucune clé API n'est fournie, l'application fonctionnera en mode local sans IA.

## 🚀 Lancement

### Lancement simultané (recommandé)

À la racine du projet :

```bash
npm run dev
```

Cela lancera le backend et le frontend simultanément.

### Lancement individuel

Backend :

```bash
cd backend
npm run dev
```

Le backend sera accessible sur `http://localhost:5050`

Frontend :

```bash
cd frontend
npm run dev
```

Le frontend sera accessible sur `http://localhost:5173`

### Si le port est déjà occupé

Si vous obtenez l'erreur "EADDRINUSE: address already in use" :

```bash
# Identifier le processus
lsof -i :5050

# Tuer le processus (remplacez PID par l'ID du processus)
kill -9 PID

# Ou changer le PORT dans backend/.env
```

**Si le port 5050 est aussi occupé** :

Vous pouvez utiliser un autre port. Modifiez les fichiers suivants avec le même port :

1. `backend/.env` : Changez `PORT=5050` en `PORT=5001` (ou autre)
2. `frontend/.env` : Changez `VITE_API_URL=http://localhost:5050` en `VITE_API_URL=http://localhost:5001` (ou même port que backend)

## 📁 Structure du projet

```
correcteur-fiscalite-pro/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Point d'entrée du serveur
│   │   ├── routes/
│   │   │   └── documents.ts      # Routes API
│   │   ├── services/
│   │   │   ├── documentService.ts    # Gestion des documents
│   │   │   ├── localAnalysisService.ts # Analyse locale
│   │   │   └── aiService.ts         # Service IA
│   │   ├── types.ts               # Types TypeScript
│   │   └── prompts.ts             # Prompts système IA
│   ├── uploads/                   # Dossier d'upload temporaire
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── pages/
│   │   │   ├── Landing.tsx        # Page d'accueil
│   │   │   ├── Dashboard.tsx      # Dashboard principal
│   │   │   ├── Upload.tsx         # Upload de documents
│   │   │   ├── Search.tsx         # Recherche dans les sources
│   │   │   ├── Question.tsx       # Analyse de questions
│   │   │   ├── Corrector.tsx      # Correcteur de réponses
│   │   │   ├── Declaration.tsx    # Déclaration IA
│   │   │   └── Settings.tsx       # Paramètres
│   │   ├── lib/
│   │   │   └── api.ts             # Client API
│   │   ├── App.tsx                # Application principale
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
└── README.md
```

## 🔧 API Routes

### Documents
- `POST /api/upload` - Upload un document
- `GET /api/documents` - Liste tous les documents
- `GET /api/documents/:id` - Récupère un document spécifique
- `DELETE /api/documents/:id` - Supprime un document

### Recherche
- `POST /api/search` - Recherche dans les documents

### Analyse
- `POST /api/analyze-question` - Analyse une question
- `POST /api/correct-answer` - Corrige une réponse
- `POST /api/improve-style` - Améliore le style
- `POST /api/optimize-answer` - Optimise une réponse
- `POST /api/count-lines` - Compte les lignes
- `GET /api/ethical-warning` - Récupère l'avertissement éthique

## 🎨 Design

L'interface utilise un design professionnel adapté à un environnement de comptabilité/fiscalité :

- **Couleurs** : Bleu marine, blanc, gris clair, touches dorées/vert fiscal
- **Typographie** : Claire et lisible
- **Interface** : Moderne avec coins arrondis
- **Responsive** : Adapté ordinateur et mobile
- **Ambiance** : Cabinet comptable / fiscalité professionnelle

## 🔑 Mots-clés de recherche

L'application supporte la recherche de mots-clés en hébreu et français :

**Hébreu :**
- דיבידנד (dividende)
- רווח הון (plus-value)
- מס חברות (impôt sociétés)
- מניות (actions)
- בעל מניות (actionnaire)
- חברה (société)
- תושב ישראל (résident israélien)
- הכנסה חייבת (revenu imposable)
- שיעור המס (taux d'imposition)
- מקור ההכנסה (source du revenu)
- חברה נשלטת זרה (société étrangère contrôlée)
- חברת משלח יד זרה (société étrangère à succursale)

**Français :**
- dividende, impôt, société, actionnaire, bénéfice, taxe, etc.

## 📝 Limites

- Limite de 15 lignes par réponse
- Mode sans API : recherche par mots-clés et analyse basique
- Mode IA : nécessite une clé API OpenAI valide
- Stockage local temporaire des documents (en mémoire)

## ⚠️ Note sur la configuration des modules

Le backend utilise TypeScript avec CommonJS. Si vous rencontrez des erreurs de module lors du démarrage, assurez-vous que :

1. Le fichier `backend/tsconfig.json` a `"module": "commonjs"`
2. Le fichier `backend/package.json` n'a PAS `"type": "module"`
3. Les imports n'utilisent PAS d'extensions `.js`

## 🤝 Contribution

Ce projet est conçu pour un usage éducatif. N'hésitez pas à l'adapter à vos besoins.

## 📄 Licence

Ce projet est fourni à des fins éducatives.

## 📞 Support

Pour toute question ou problème, consultez la documentation ou contactez le développeur.

---

**Rappel** : Cet outil est un assistant d'apprentissage. Les réponses finales et le raisonnement fiscal doivent être rédigés et vérifiés par l'étudiante elle-même.
