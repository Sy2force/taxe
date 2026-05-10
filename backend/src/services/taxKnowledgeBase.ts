// Base de connaissances fiscale locale pour l'analyse de questions
// Sert à améliorer la recherche et l'analyse sans remplacer les documents importés

export interface TaxConcept {
  id: string;
  nomFrancais: string;
  nomHebreu: string;
  motsClesFrancais: string[];
  motsClesHebreu: string[];
  descriptionCourte: string;
  questionsTypiques: string[];
  elementsAVerifier: string[];
  erreursFrequentes: string[];
  structureReponseConseillee: string[];
}

export const taxKnowledgeBase: TaxConcept[] = [
  {
    id: 'societe',
    nomFrancais: 'Société',
    nomHebreu: 'חברה',
    motsClesFrancais: ['société', 'entreprise', 'company', 'entity', 'corporation', 'personne morale'],
    motsClesHebreu: ['חברה', 'תאגיד', 'חברה בע"מ', 'חברה ישראלית', 'חברה זרה'],
    descriptionCourte: "Personne morale distincte de ses actionnaires, sujet d'imposition autonome",
    questionsTypiques: [
      'Quel est le type de société ?',
      'La société est-elle israélienne ou étrangère ?',
      'Qui sont les actionnaires ?',
      'Quel est le pourcentage de détention ?'
    ],
    elementsAVerifier: [
      'Type de société (SA, SARL, etc.)',
      'Pays d\'imposition',
      'Actionnaires et leurs parts',
      'Statut fiscal'
    ],
    erreursFrequentes: [
      'Confondre société et actionnaire',
      'Oublier de vérifier la résidence fiscale',
      'Ne pas identifier le type de société',
      'Confondre société contrôlée et société mère'
    ],
    structureReponseConseillee: [
      'Identifier la société concernée',
      'Préciser son statut fiscal',
      'Indiquer le pays d\'imposition',
      'Citer la règle applicable',
      'Conclure sur l\'assujettissement'
    ]
  },
  {
    id: 'actionnaire',
    nomFrancais: 'Actionnaire',
    nomHebreu: 'בעל מניות',
    motsClesFrancais: ['actionnaire', 'shareholder', 'détenteur', 'propriétaire', 'titulaire'],
    motsClesHebreu: ['בעל מניות', 'מחזיק מניות', 'בעל השליטה', 'בעל מניות מהותי'],
    descriptionCourte: 'Personne physique ou morale détenant des parts ou actions d\'une société',
    questionsTypiques: [
      'Qui est l\'actionnaire ?',
      'Quel est le pourcentage de détention ?',
      'L\'actionnaire est-il résident d\'Israël ?',
      'Est-ce un actionnaire significatif ?'
    ],
    elementsAVerifier: [
      'Identité de l\'actionnaire',
      'Pourcentage de détention',
      'Résidence fiscale',
      'Date d\'acquisition',
      "Type d'actions"
    ],
    erreursFrequentes: [
      'Oublier de vérifier le pourcentage de détention',
      'Confondre actionnaire et société',
      'Ne pas identifier la résidence fiscale',
      'Oublier les actionnaires significatifs (>10%)'
    ],
    structureReponseConseillee: [
      'Identifier l\'actionnaire',
      'Préciser le pourcentage de détention',
      'Indiquer la résidence fiscale',
      'Appliquer la règle selon le pourcentage',
      'Conclure sur l\'imposition'
    ]
  },
  {
    id: 'dividende',
    nomFrancais: 'Dividende',
    nomHebreu: 'דיבידנד',
    motsClesFrancais: ['dividende', 'distribution', 'profit', 'bénéfice', 'distribution de bénéfices'],
    motsClesHebreu: ['דיבידנד', 'חלוקה', 'חלוקת רווחים', 'תשלום דיבידנד'],
    descriptionCourte: 'Distribution des bénéfices d\'une société à ses actionnaires',
    questionsTypiques: [
      'S\'agit-il d\'un dividende ?',
      'Quel est le montant du dividende ?',
      'Qui reçoit le dividende ?',
      'Quand a-t-il été distribué ?'
    ],
    elementsAVerifier: [
      'Type de distribution (dividende, retrait)',
      'Montant distribué',
      'Bénéficiaire',
      'Date de distribution',
      'Taux d\'imposition applicable',
      'Source juridique (section 125b)'
    ],
    erreursFrequentes: [
      'Confondre dividende et retrait de société',
      'Appliquer le mauvais taux (25% vs 30%)',
      'Oublier de vérifier le pourcentage de détention',
      'Ne pas citer la section 125b'
    ],
    structureReponseConseillee: [
      'Identifier l\'événement (dividende)',
      'Préciser le bénéficiaire',
      'Indiquer le montant',
      'Vérifier le pourcentage de détention',
      'Appliquer le taux de la section 125b',
      'Conclure sur l\'imposition'
    ]
  },
  {
    id: 'distribution',
    nomFrancais: 'Distribution',
    nomHebreu: 'חלוקה',
    motsClesFrancais: ['distribution', 'versement', 'paiement', 'remise', 'allocation'],
    motsClesHebreu: ['חלוקה', 'תשלום', 'העברה', 'הפקדה'],
    descriptionCourte: 'Tout versement d\'une société à ses actionnaires (dividendes, retraits, etc.)',
    questionsTypiques: [
      'S\'agit-il d\'une distribution ?',
      'Quel type de distribution ?',
      'La distribution est-elle justifiée ?',
      'Y a-t-il des bénéfices distribuables ?'
    ],
    elementsAVerifier: [
      'Type de distribution',
      'Montant',
      'Justification',
      'Bénéfices disponibles',
      'Règle fiscale applicable'
    ],
    erreursFrequentes: [
      'Confondre distribution et salaire',
      'Oublier de vérifier les bénéfices disponibles',
      'Ne pas identifier le type de distribution',
      'Ne pas vérifier la justification'
    ],
    structureReponseConseillee: [
      'Caractériser la distribution',
      'Vérifier les conditions',
      'Appliquer la règle fiscale',
      'Calculer l\'imposition',
      'Conclure'
    ]
  },
  {
    id: 'revenu_imposable',
    nomFrancais: 'Revenu imposable',
    nomHebreu: 'הכנסה חייבת',
    motsClesFrancais: ['revenu imposable', 'revenu', 'income', 'taxable income', 'assiette'],
    motsClesHebreu: ['הכנסה חייבת', 'הכנסה', 'רווח', 'תשואה'],
    descriptionCourte: 'Revenu soumis à l\'impôt selon la loi fiscale',
    questionsTypiques: [
      'Quel est le revenu imposable ?',
      'Comment est-il calculé ?',
      'Y a-t-il des déductions ?',
      'Quel est le taux applicable ?'
    ],
    elementsAVerifier: [
      'Nature du revenu',
      'Montant brut',
      'Déductions applicables',
      'Taux d\'imposition',
      'Source juridique'
    ],
    erreursFrequentes: [
      'Confondre revenu brut et net',
      'Oublier les déductions',
      'Appliquer le mauvais taux',
      'Ne pas justifier le calcul'
    ],
    structureReponseConseillee: [
      'Identifier le revenu',
      'Calculer le revenu brut',
      'Appliquer les déductions',
      'Déterminer le taux',
      'Calculer l\'impôt',
      'Conclure'
    ]
  },
  {
    id: 'residence_fiscale',
    nomFrancais: 'Résidence fiscale',
    nomHebreu: 'תושבות מס',
    motsClesFrancais: ['résidence fiscale', 'résident', 'tax resident', 'domicile fiscal'],
    motsClesHebreu: ['תושבות מס', 'תושב ישראל', 'תושב חוץ', 'מרכז חיים'],
    descriptionCourte: 'Statut fiscal d\'une personne ou entité selon les critères de résidence',
    questionsTypiques: [
      'La personne est-elle résidente fiscale d\'Israël ?',
      'Quels sont les critères de résidence ?',
      'Où est le centre d\'intérêts vitaux ?',
      'Combien de jours en Israël ?'
    ],
    elementsAVerifier: [
      'Centre de vie',
      'Centre d\'intérêts vitaux',
      'Présence en Israël (jours)',
      'Critères de la section 1',
      'Statut selon les règles'
    ],
    erreursFrequentes: [
      'Confondre résidence et nationalité',
      'Oublier les critères de présence',
      'Ne pas vérifier le centre d\'intérêts',
      'Ne pas citer la section 1'
    ],
    structureReponseConseillee: [
      'Analyser les critères de résidence',
      'Vérifier le centre de vie',
      'Vérifier la présence',
      'Appliquer les règles de la section 1',
      'Conclure sur le statut'
    ]
  },
  {
    id: 'societe_etrangere_controlee',
    nomFrancais: 'Société étrangère contrôlée',
    nomHebreu: 'חברה נשלטת זרה',
    motsClesFrancais: ['société étrangère contrôlée', 'CFC', 'controlled foreign company', 'société contrôlée'],
    motsClesHebreu: ['חברה נשלטת זרה', 'חברה זרה מבוקרת', 'שליטה בחברה זרה'],
    descriptionCourte: 'Société étrangère contrôlée par des résidents israéliens, soumise à des règles spéciales',
    questionsTypiques: [
      'S\'agit-il d\'une société étrangère contrôlée ?',
      'Qui contrôle la société ?',
      'Quel est le pourcentage de contrôle ?',
      'Les règles CFC s\'appliquent-elles ?'
    ],
    elementsAVerifier: [
      'Pays d\'incorporation',
      'Actionnaires résidents israéliens',
      'Pourcentage de contrôle (>50%)',
      'Type de revenus (passifs vs actifs)',
      'Règles CFC applicables'
    ],
    erreursFrequentes: [
      'Ne pas vérifier le seuil de contrôle',
      'Oublier les revenus passifs',
      'Confondre contrôle et détention',
      'Ne pas identifier le pays'
    ],
    structureReponseConseillee: [
      'Identifier la société',
      'Vérifier le contrôle par résidents israéliens',
      'Analyser le type de revenus',
      'Appliquer les règles CFC si applicables',
      'Conclure sur l\'imposition'
    ]
  },
  {
    id: 'plus_value',
    nomFrancais: 'Plus-value',
    nomHebreu: 'רווח הון',
    motsClesFrancais: ['plus-value', 'gain en capital', 'capital gain', 'profit sur vente', 'gain'],
    motsClesHebreu: ['רווח הון', 'רווח ממכירה', 'תשואה', 'רווח מהשקעה'],
    descriptionCourte: 'Gain réalisé lors de la vente d\'un actif (actions, immeuble, etc.)',
    questionsTypiques: [
      'S\'agit-il d\'une plus-value ?',
      'Quel est le prix de vente ?',
      'Quel est le prix d\'acquisition ?',
      'Y a-t-il une exemption ?'
    ],
    elementsAVerifier: [
      'Type d\'actif vendu',
      'Prix de vente',
      "Prix d'acquisition",
      'Date d\'acquisition',
      'Date de vente',
      'Période de détention',
      'Exemption (section 88 pour actions)',
      'Taux d\'imposition'
    ],
    erreursFrequentes: [
      'Confondre plus-value et revenu',
      'Oublier d\'indexer le prix d\'acquisition',
      'Ne pas vérifier l\'exemption après 5 ans',
      'Ne pas citer la section 88'
    ],
    structureReponseConseillee: [
      'Identifier l\'opération de vente',
      'Calculer la plus-value (vente - acquisition indexée)',
      'Vérifier la période de détention',
      'Appliquer l\'exemption si applicable',
      'Appliquer le taux',
      'Conclure'
    ]
  },
  {
    id: 'taux_imposition',
    nomFrancais: 'Taux d\'imposition',
    nomHebreu: 'שיעור מס',
    motsClesFrancais: ['taux d\'imposition', 'taux', 'tax rate', 'pourcentage', 'imposition'],
    motsClesHebreu: ['שיעור מס', 'אחוז', 'שיעור', 'מס'],
    descriptionCourte: 'Pourcentage appliqué à la base imposable pour calculer l\'impôt',
    questionsTypiques: [
      'Quel est le taux d\'imposition ?',
      'Pourquoi ce taux ?',
      'Y a-t-il un taux réduit ?',
      'Le taux est-il correct ?'
    ],
    elementsAVerifier: [
      'Type de revenu',
      'Résidence fiscale',
      'Section applicable',
      'Pourcentage de détention (pour dividendes)',
      'Période de détention (pour plus-values)',
      'Taux selon la loi'
    ],
    erreursFrequentes: [
      'Appliquer le mauvais taux',
      'Ne pas justifier le taux',
      'Oublier les taux progressifs',
      'Ne pas vérifier les conditions de taux réduit'
    ],
    structureReponseConseillee: [
      'Identifier le type de revenu',
      'Vérifier les conditions',
      'Citer la section applicable',
      'Appliquer le taux correct',
      'Justifier le choix du taux'
    ]
  },
  {
    id: 'evenement_fiscal',
    nomFrancais: 'Événement fiscal',
    nomHebreu: 'אירוע מס',
    motsClesFrancais: ['événement fiscal', 'fait générateur', 'tax event', 'opération taxable'],
    motsClesHebreu: ['אירוע מס', 'מאורע מס', 'אירוע חיוב במס'],
    descriptionCourte: "Événement qui déclenche une obligation fiscale (vente, distribution, etc.)",
    questionsTypiques: [
      'Quel est l\'événement fiscal ?',
      'Quand s\'est-il produit ?',
      'Pourquoi est-il taxable ?',
      'Quelle règle s\'applique ?'
    ],
    elementsAVerifier: [
      'Nature de l\'événement',
      'Date de l\'événement',
      'Parties impliquées',
      'Montant concerné',
      'Règle fiscale applicable'
    ],
    erreursFrequentes: [
      'Ne pas identifier l\'événement',
      'Confondre date de l\'événement et date d\'imposition',
      'Oublier de vérifier la taxabilité',
      'Ne pas citer la règle'
    ],
    structureReponseConseillee: [
      'Identifier l\'événement fiscal',
      'Préciser la date',
      'Vérifier la taxabilité',
      'Citer la règle applicable',
      'Déterminer les conséquences fiscales'
    ]
  },
  {
    id: 'date_imposition',
    nomFrancais: "Date d'imposition",
    nomHebreu: 'מועד החיוב במס',
    motsClesFrancais: ["date d'imposition", "moment d'imposition", 'tax timing', 'date de fait générateur'],
    motsClesHebreu: ['מועד החיוב במס', 'מועד מס', 'זמן החיוב'],
    descriptionCourte: "Date à laquelle l'obligation fiscale naît",
    questionsTypiques: [
      "Quelle est la date d'imposition ?",
      'Pourquoi cette date ?',
      'Y a-t-il des règles spéciales ?',
      'La date est-elle correcte ?'
    ],
    elementsAVerifier: [
      "Type d'opération",
      "Date de l'événement",
      'Règle de la section applicable',
      'Règles spéciales (report, anticipation)',
      'Date de déclaration'
    ],
    erreursFrequentes: [
      'Confondre date d\'événement et date d\'imposition',
      'Oublier les règles spéciales',
      'Ne pas citer la section applicable',
      'Ne pas vérifier le moment exact'
    ],
    structureReponseConseillee: [
      'Identifier l\'événement',
      'Déterminer la date de l\'événement',
      'Appliquer la règle de timing',
      'Citer la section applicable',
      'Conclure sur la date d\'imposition'
    ]
  },
  {
    id: 'article_loi',
    nomFrancais: 'Article de loi',
    nomHebreu: 'סעיף',
    motsClesFrancais: ['article', 'section', 'loi', 'ordonnance', 'texte de loi', 'disposition'],
    motsClesHebreu: ['סעיף', 'סעיף בחוק', 'פקודה', 'תקנה', 'סעיף בפקודה'],
    descriptionCourte: 'Disposition légale précise qui définit une règle fiscale',
    questionsTypiques: [
      'Quel article s\'applique ?',
      'Que dit cet article ?',
      'Pourquoi cet article ?',
      'Y a-t-il d\'autres articles applicables ?'
    ],
    elementsAVerifier: [
      'Numéro de section/article',
      'Contenu de la disposition',
      'Conditions d\'application',
      'Exceptions',
      'Page dans le document'
    ],
    erreursFrequentes: [
      'Citer un article sans vérifier',
      'Citer le mauvais article',
      'Ne pas préciser les conditions',
      'Ne pas donner la page'
    ],
    structureReponseConseillee: [
      'Identifier l\'article applicable',
      'Citer le contenu pertinent',
      'Vérifier les conditions',
      'Appliquer à la situation',
      'Indiquer la page source'
    ]
  },
  {
    id: 'ordonnance_fiscale',
    nomFrancais: 'Ordonnance fiscale',
    nomHebreu: 'פקודת מס הכנסה',
    motsClesFrancais: ['ordonnance fiscale', 'ordonnance', 'loi', 'Income Tax Ordinance', 'tax law'],
    motsClesHebreu: ['פקודת מס הכנסה', 'פקודה', 'חוק מס', 'חוק'],
    descriptionCourte: 'Texte législatif principal en matière d\'impôt sur le revenu en Israël',
    questionsTypiques: [
      'Quelle ordonnance s\'applique ?',
      'Quelle section de l\'ordonnance ?',
      'Y a-t-il des amendements ?',
      'Comment interpréter cette disposition ?'
    ],
    elementsAVerifier: [
      'Nom de l\'ordonnance',
      'Numéro de section',
      'Contenu de la section',
      'Amendements applicables',
      'Interprétation jurisprudentielle'
    ],
    erreursFrequentes: [
      'Ne pas citer l\'ordonnance',
      'Confondre ordonnance et autre texte',
      'Ne pas vérifier les amendements',
      'Ne pas préciser la section'
    ],
    structureReponseConseillee: [
      'Identifier l\'ordonnance applicable',
      'Citer la section précise',
      'Vérifier le contenu',
      'Appliquer à la situation',
      'Conclure'
    ]
  },
  {
    id: 'deduction',
    nomFrancais: 'Déduction',
    nomHebreu: 'ניכוי',
    motsClesFrancais: ['déduction', 'réduction', 'abattement', 'expense déductible', 'déduction fiscale'],
    motsClesHebreu: ['ניכוי', 'הפחתה', 'ניכוי מס', 'הוצאה מוכרת'],
    descriptionCourte: 'Montant soustrait du revenu brut pour obtenir le revenu imposable',
    questionsTypiques: [
      'Y a-t-il des déductions ?',
      'Quelles déductions sont applicables ?',
      'Les dépenses sont-elles déductibles ?',
      'Comment calculer les déductions ?'
    ],
    elementsAVerifier: [
      'Type de dépense',
      'Conditions de déductibilité',
      'Montant',
      'Preuve requise',
      'Section applicable'
    ],
    erreursFrequentes: [
      'Déduire des dépenses non autorisées',
      'Ne pas vérifier les conditions',
      'Confondre déduction et crédit',
      'Ne pas justifier la déduction'
    ],
    structureReponseConseillee: [
      'Identifier les dépenses',
      'Vérifier la déductibilité',
      'Calculer le montant déductible',
      'Appliquer la déduction',
      'Citer la section applicable'
    ]
  },
  {
    id: 'exoneration',
    nomFrancais: 'Exonération',
    nomHebreu: 'פטור',
    motsClesFrancais: ['exonération', 'exempté', 'non imposable', 'exemption', 'exonéré d\'impôt'],
    motsClesHebreu: ['פטור', 'פטור ממס', 'לא חייב', 'פטור ממס הכנסה'],
    descriptionCourte: 'Dispense d\'impôt selon une disposition légale spécifique',
    questionsTypiques: [
      'Y a-t-il une exonération ?',
      'Pourquoi l\'exonération ?',
      'Quelles sont les conditions ?',
      'L\'exonération est-elle partielle ou totale ?'
    ],
    elementsAVerifier: [
      'Type d\'exonération',
      'Conditions requises',
      'Période d\'application',
      'Section applicable',
      'Montant exonéré'
    ],
    erreursFrequentes: [
      'Appliquer une exonération sans vérifier les conditions',
      'Confondre exonération et taux réduit',
      'Ne pas citer la section',
      'Ne pas vérifier la période'
    ],
    structureReponseConseillee: [
      'Identifier l\'exonération potentielle',
      'Vérifier toutes les conditions',
      'Citer la section applicable',
      'Appliquer l\'exonération',
      'Conclure sur le revenu exonéré'
    ]
  },
  {
    id: 'controle',
    nomFrancais: 'Contrôle',
    nomHebreu: 'שליטה',
    motsClesFrancais: ['contrôle', 'détention', 'majorité', 'contrôle majoritaire', 'influence notable'],
    motsClesHebreu: ['שליטה', 'החזקה', 'רוב', 'שליטה במניות', 'השפעה מהותית'],
    descriptionCourte: 'Pouvoir de diriger une société, généralement par détention de plus de 50% des droits de vote',
    questionsTypiques: [
      'Y a-t-il un contrôle ?',
      'Qui contrôle la société ?',
      'Quel est le pourcentage de contrôle ?',
      'Le contrôle est-il direct ou indirect ?'
    ],
    elementsAVerifier: [
      'Pourcentage de droits de vote',
      'Actionnaire contrôlant',
      'Contrôle direct ou indirect',
      'Droits de contrôle additionnels',
      'Période de contrôle'
    ],
    erreursFrequentes: [
      'Confondre détention et contrôle',
      'Oublier le contrôle indirect',
      'Ne pas vérifier les droits de vote',
      'Ne pas identifier le contrôleur'
    ],
    structureReponseConseillee: [
      'Analyser la structure de capital',
      'Identifier le contrôleur',
      'Vérifier le pourcentage de contrôle',
      'Appliquer les règles selon le type de contrôle',
      'Conclure'
    ]
  },
  {
    id: 'pret_actionnaire',
    nomFrancais: 'Prêt à actionnaire',
    nomHebreu: 'הלוואה לבעל מניות',
    motsClesFrancais: ['prêt à actionnaire', 'emprunt', 'prêt sans intérêt', 'loan to shareholder'],
    motsClesHebreu: ['הלוואה לבעל מניות', 'הלוואה', 'הלוואה ללא ריבית'],
    descriptionCourte: 'Prêt accordé par une société à l\'un de ses actionnaires',
    questionsTypiques: [
      'S\'agit-il d\'un prêt à actionnaire ?',
      'Y a-t-il des intérêts ?',
      'Quel est le taux ?',
      'La section 3(9) s\'applique-t-elle ?'
    ],
    elementsAVerifier: [
      'Emprunteur (actionnaire)',
      'Montant du prêt',
      'Taux d\'intérêt',
      'Durée du prêt',
      'Section 3(9) - imputation d\'intérêt',
      'Taux d\'intérêt de référence'
    ],
    erreursFrequentes: [
      'Oublier la section 3(9)',
      'Ne pas calculer l\'intérêt imputé',
      'Ne pas vérifier le taux de référence',
      'Confondre prêt et distribution'
    ],
    structureReponseConseillee: [
      'Identifier le prêt',
      'Vérifier les conditions de la section 3(9)',
      'Calculer l\'intérêt imputé',
      'Déterminer l\'imposition',
      'Conclure'
    ]
  },
  {
    id: 'retenue_source',
    nomFrancais: 'Retenue à la source',
    nomHebreu: 'ניכוי מס במקור',
    motsClesFrancais: ['retenue à la source', 'WHT', 'withholding tax', 'prélèvement à la source'],
    motsClesHebreu: ['ניכוי מס במקור', 'ניכוי במקור', 'מס במקור'],
    descriptionCourte: 'Impôt retenu à la source lors d\'un paiement (dividende, intérêt, redevance)',
    questionsTypiques: [
      'Y a-t-il une retenue à la source ?',
      'Quel est le taux ?',
      'Qui doit retenir ?',
      'Comment déclarer ?'
    ],
    elementsAVerifier: [
      'Type de revenu',
      'Taux de retenue',
      'Obligation de retenue',
      'Paiement net vs brut',
      'Crédit d\'impôt',
      'Section applicable'
    ],
    erreursFrequentes: [
      'Appliquer le mauvais taux',
      'Oublier d\'identifier le redevable',
      'Confondre taux brut et net',
      'Ne pas vérifier les conventions fiscales'
    ],
    structureReponseConseillee: [
      'Identifier le type de revenu',
      'Déterminer le taux applicable',
      'Identifier le redevable',
      'Calculer la retenue',
      'Citer la section applicable'
    ]
  },
  {
    id: 'bénéfice_non_distribue',
    nomFrancais: 'Bénéfice non distribué',
    nomHebreu: 'רווחים שלא חולקו',
    motsClesFrancais: ['bénéfice non distribué', 'réserves', 'bénéfices accumulés', 'undistributed profits'],
    motsClesHebreu: ['רווחים שלא חולקו', 'רווחים מצטופים', 'עתודות'],
    descriptionCourte: 'Bénéfices conservés par la société et non distribués aux actionnaires',
    questionsTypiques: [
      'Y a-t-il des bénéfices non distribués ?',
      'Quel est le montant ?',
      'Pourquoi non distribués ?',
      'Y a-t-il des règles spéciales ?'
    ],
    elementsAVerifier: [
      'Montant des bénéfices',
      'Période d\'accumulation',
      'Raison de non-distribution',
      'Règles applicables (CFC, etc.)',
      'Imputation éventuelle'
    ],
    erreursFrequentes: [
      'Confondre bénéfices distribués et non distribués',
      'Oublier les règles CFC',
      'Ne pas vérifier la période',
      'Ne pas identifier les réserves'
    ],
    structureReponseConseillee: [
      'Identifier les bénéfices',
      'Vérifier le statut (distribué vs non distribué)',
      'Appliquer les règles spéciales si applicables',
      'Conclure sur le traitement fiscal'
    ]
  },
  {
    id: 'revenus_passifs',
    nomFrancais: 'Revenus passifs',
    nomHebreu: 'הכנסות פסיביות',
    motsClesFrancais: ['revenus passifs', 'revenus de placement', 'intérêts', 'dividendes', 'loyers'],
    motsClesHebreu: ['הכנסות פסיביות', 'הכנסות מהשקעה', 'ריבית', 'דיבידנדים'],
    descriptionCourte: 'Revenus provenant d\'investissements (intérêts, dividendes, loyers) plutôt que d\'activité commerciale',
    questionsTypiques: [
      'S\'agit-il de revenus passifs ?',
      'Quel type de revenus passifs ?',
      'Les règles CFC s\'appliquent-elles ?',
      'Y a-t-il des exonérations ?'
    ],
    elementsAVerifier: [
      'Type de revenu passif',
      'Source du revenu',
      'Pays de source',
      'Bénéficiaire',
      'Règles CFC si applicable',
      'Taux d\'imposition'
    ],
    erreursFrequentes: [
      'Confondre revenus passifs et actifs',
      'Oublier les règles CFC',
      'Appliquer le mauvais taux',
      'Ne pas vérifier le pays de source'
    ],
    structureReponseConseillee: [
      'Caractériser le revenu',
      'Vérifier les règles CFC si applicable',
      'Déterminer le taux',
      'Calculer l\'imposition',
      'Conclure'
    ]
  },
  {
    id: 'vente_actions',
    nomFrancais: "Vente d'actions",
    nomHebreu: 'מכירת מניות',
    motsClesFrancais: ["vente d'actions", 'cession', 'aliénation', 'sale of shares', 'disposal'],
    motsClesHebreu: ['מכירת מניות', 'מכירה', 'מסירה', 'מכירת החזקות'],
    descriptionCourte: "Opération de cession d'actions d'une société",
    questionsTypiques: [
      "S'agit-il d'une vente d'actions ?",
      'Quel est le prix de vente ?',
      'Quand les actions ont-elles été acquises ?',
      'Y a-t-il une exemption ?'
    ],
    elementsAVerifier: [
      'Prix de vente',
      "Prix d'acquisition",
      "Date d'acquisition",
      'Date de vente',
      'Période de détention',
      'Section 88 (exemption après 5 ans)',
      "Type d'actions"
    ],
    erreursFrequentes: [
      'Oublier d\'indexer le prix d\'acquisition',
      'Ne pas vérifier la période de détention',
      'Oublier l\'exemption de la section 88',
      'Confondre vente et distribution'
    ],
    structureReponseConseillee: [
      'Identifier l\'opération',
      'Calculer la plus-value',
      'Vérifier l\'exemption (section 88)',
      'Appliquer le taux',
      'Conclure'
    ]
  },
  {
    id: 'retrait_societe',
    nomFrancais: 'Retrait de société',
    nomHebreu: 'משיכה מחברה',
    motsClesFrancais: ['retrait de société', 'retrait', 'distribution déguisée', 'withdrawal'],
    motsClesHebreu: ['משיכה מחברה', 'משיכה', 'הוצאה מחברה'],
    descriptionCourte: 'Prélèvement effectué par un actionnaire sur une société, pouvant être requalifié en dividende',
    questionsTypiques: [
      'S\'agit-il d\'un retrait ou d\'un dividende ?',
      'Y a-t-il des bénéfices ?',
      'Le retrait est-il justifié ?',
      'Doit-il être requalifié ?'
    ],
    elementsAVerifier: [
      'Nature du prélèvement',
      'Justification',
      'Bénéfices disponibles',
      'Règles de requalification',
      'Section applicable'
    ],
    erreursFrequentes: [
      'Confondre retrait et dividende',
      'Ne pas vérifier la justification',
      'Oublier les bénéfices disponibles',
      'Ne pas appliquer les règles de requalification'
    ],
    structureReponseConseillee: [
      'Caractériser l\'opération',
      'Vérifier la justification',
      'Analyser les bénéfices',
      'Appliquer les règles de requalification si applicables',
      'Conclure'
    ]
  },
  {
    id: 'actionnaire_significatif',
    nomFrancais: 'Actionnaire significatif',
    nomHebreu: 'בעל מניות מהותי',
    motsClesFrancais: ['actionnaire significatif', 'actionnaire majeur', 'détention importante', 'significant shareholder'],
    motsClesHebreu: ['בעל מניות מהותי', 'בעל מניות חשוב', 'מחזיק מניות מרכזי'],
    descriptionCourte: 'Actionnaire détenant une part importante du capital (généralement >10%)',
    questionsTypiques: [
      'Y a-t-il des actionnaires significatifs ?',
      'Quel est leur pourcentage ?',
      'Des règles spéciales s\'appliquent-elles ?',
      'Quel taux pour les dividendes ?'
    ],
    elementsAVerifier: [
      'Pourcentage de détention',
      'Seuil de signification (>10%)',
      'Taux de dividende applicable (30% vs 25%)',
      'Droits de contrôle',
      'Section 125b'
    ],
    erreursFrequentes: [
      'Ne pas identifier les actionnaires >10%',
      'Appliquer le mauvais taux de dividende',
      'Oublier les règles spéciales',
      'Ne pas vérifier le pourcentage exact'
    ],
    structureReponseConseillee: [
      'Identifier les actionnaires significatifs',
      'Vérifier le pourcentage de détention',
      'Appliquer le taux correct selon la section 125b',
      'Conclure'
    ]
  },
  {
    id: 'assujettissement',
    nomFrancais: 'Assujettissement',
    nomHebreu: 'חבות במס',
    motsClesFrancais: ['assujettissement', 'soumis à l\'impôt', 'taxable', 'imposable'],
    motsClesHebreu: ['חבות במס', 'חייב במס', 'מחויב במס', 'כפוף למס'],
    descriptionCourte: "Condition d'être soumis à l'impôt selon la loi fiscale",
    questionsTypiques: [
      'Le revenu est-il assujetti à l\'impôt ?',
      'Pourquoi assujetti ou non ?',
      'Quelle est la base d\'assujettissement ?',
      'Y a-t-il une exemption ?'
    ],
    elementsAVerifier: [
      'Nature du revenu',
      'Résidence fiscale',
      'Source du revenu',
      'Exemptions applicables',
      'Section applicable'
    ],
    erreursFrequentes: [
      'Ne pas vérifier l\'assujettissement',
      'Confondre assujettissement et imposition',
      'Oublier les exemptions',
      'Ne pas citer la règle'
    ],
    structureReponseConseillee: [
      'Analyser le revenu',
      'Vérifier les conditions d\'assujettissement',
      'Identifier les exemptions',
      'Citer la section applicable',
      'Conclure sur l\'assujettissement'
    ]
  }
];

// Fonction pour rechercher des concepts par mots-clés
export function searchConcepts(query: string): TaxConcept[] {
  const lowerQuery = query.toLowerCase();
  
  return taxKnowledgeBase.filter(concept => {
    const matchFrancais = concept.motsClesFrancais.some(keyword => 
      lowerQuery.includes(keyword.toLowerCase())
    );
    const matchHebreu = concept.motsClesHebreu.some(keyword => 
      lowerQuery.includes(keyword.toLowerCase())
    );
    const matchNom = lowerQuery.includes(concept.nomFrancais.toLowerCase()) ||
                   lowerQuery.includes(concept.nomHebreu);
    
    return matchFrancais || matchHebreu || matchNom;
  });
}

// Fonction pour obtenir un concept par ID
export function getConceptById(id: string): TaxConcept | undefined {
  return taxKnowledgeBase.find(concept => concept.id === id);
}

// Fonction pour obtenir tous les mots-clés hébreu
export function getAllHebrewKeywords(): string[] {
  const keywords = new Set<string>();
  taxKnowledgeBase.forEach(concept => {
    concept.motsClesHebreu.forEach(keyword => keywords.add(keyword));
  });
  return Array.from(keywords);
}

// Fonction pour obtenir tous les mots-clés français
export function getAllFrenchKeywords(): string[] {
  const keywords = new Set<string>();
  taxKnowledgeBase.forEach(concept => {
    concept.motsClesFrancais.forEach(keyword => keywords.add(keyword));
  });
  return Array.from(keywords);
}
