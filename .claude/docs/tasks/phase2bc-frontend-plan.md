# Phase 2B et 2C - Plan d'implémentation Frontend

**Date**: 2026-01-12
**Agent**: nextjs-developer (planification)
**Status**: Plan détaillé complet

---

## Contexte et architecture existante

### Frontend Next.js actuel

**Structure de l'app mobile-first:**
```
apps/web/src/
├── app/mobile/
│   ├── [sessionId]/
│   │   ├── page.tsx           → Upload des 2 photos
│   │   └── results/page.tsx   → Affichage des résultats
├── components/mobile/
│   ├── ImageUploader.tsx      → Upload photo avec preview
│   ├── GradeResultCard.tsx    → Card affichant le grade final
│   ├── GradeCriteriaBar.tsx   → Barre de progression par critère
│   ├── FeedbackModal.tsx      → Modal de correction (Phase 2A - déjà impl.)
│   └── ...
├── hooks/
│   ├── useSession.ts          → Gestion session
│   ├── useImageUpload.ts      → Upload images
│   └── useFeedback.ts         → Soumission feedback (Phase 2A)
├── lib/
│   ├── api.ts                 → Client API
│   └── types.ts               → Types TypeScript
```

**Composants existants analysés:**
- `ImageUploader`: Upload photo avec preview, gère les états loading/success
- `GradeResultCard`: Affiche le résultat final avec gradient de couleur selon la note
- `GradeCriteriaBar`: Barre de progression pour chaque critère
- `FeedbackModal`: Modal de correction des notes (Phase 2A déjà implémentée)

**Types existants:**
```typescript
Session {
  cardName?: string
  cardSet?: string
  cardYear?: number
  cardType?: string
  status, images, gradeResults...
}
```

**API client existante:**
- `createSession()`, `getSession()`, `uploadImage()`
- `analyzeSession()`, `getSessionResults()`
- `submitFeedback()` (Phase 2A)

---

## Phase 2B - Reconnaissance de carte (OCR)

### Objectif
Afficher les informations de la carte identifiée automatiquement via OCR et permettre à l'utilisateur de corriger si nécessaire.

---

### 1. User Flow détaillé

```
┌─────────────────────────────────────────────────────────────────┐
│ ÉTAPE 1: Upload des photos                                      │
├─────────────────────────────────────────────────────────────────┤
│ Utilisateur: Upload face avant + face arrière                   │
│ État: Les 2 images sont uploadées                               │
│                                                                  │
│ ↓                                                                │
├─────────────────────────────────────────────────────────────────┤
│ ÉTAPE 2: Déclenchement identification automatique               │
├─────────────────────────────────────────────────────────────────┤
│ Système: Appel automatique POST /sessions/:id/identify          │
│ État: Loading "Identification de la carte en cours..."          │
│ Durée: 2-4 secondes                                             │
│                                                                  │
│ ↓                                                                │
├─────────────────────────────────────────────────────────────────┤
│ ÉTAPE 3A: Identification réussie (confiance >= 0.7)            │
├─────────────────────────────────────────────────────────────────┤
│ Affichage: CardIdentificationBanner                             │
│ Contenu:                                                         │
│   - "Carte détectée: Pikachu - Base Set (1999)"                │
│   - Icône confiance: 🎯 (haute), ⚠️ (moyenne), ❌ (faible)     │
│   - Bouton "Modifier" pour correction manuelle                  │
│ Action possible: Continuer vers analyse OU Modifier les infos   │
│                                                                  │
│ ↓                                                                │
├─────────────────────────────────────────────────────────────────┤
│ ÉTAPE 3B: Identification échouée (confiance < 0.3)             │
├─────────────────────────────────────────────────────────────────┤
│ Affichage: CardIdentificationFailed                             │
│ Contenu:                                                         │
│   - "❌ Impossible d'identifier la carte automatiquement"       │
│   - "Cliquez pour rechercher manuellement"                      │
│ Action requise: Ouvrir CardInfoEditor en mode recherche         │
│                                                                  │
│ ↓                                                                │
├─────────────────────────────────────────────────────────────────┤
│ ÉTAPE 3C: Identification incertaine (0.3 <= confiance < 0.7)   │
├─────────────────────────────────────────────────────────────────┤
│ Affichage: CardIdentificationBanner (mode incertain)            │
│ Contenu:                                                         │
│   - "⚠️ Carte détectée (incertaine): Pikachu - Base Set"       │
│   - Message: "Veuillez vérifier et corriger si nécessaire"     │
│   - Bouton "Vérifier" (obligatoire)                            │
│                                                                  │
│ ↓                                                                │
├─────────────────────────────────────────────────────────────────┤
│ ÉTAPE 4: Modification manuelle (optionnelle)                    │
├─────────────────────────────────────────────────────────────────┤
│ Clic sur "Modifier" → Modal CardInfoEditor                      │
│ Contenu:                                                         │
│   - Input cardName avec auto-complétion (recherche TCGdex)     │
│   - Input cardSet avec suggestions                              │
│   - Input cardYear (numérique)                                  │
│   - Preview mini de la carte (si trouvée dans TCGdex)          │
│   - Boutons "Annuler" / "Enregistrer"                          │
│ Action: PATCH /sessions/:id avec nouvelles infos               │
│                                                                  │
│ ↓                                                                │
├─────────────────────────────────────────────────────────────────┤
│ ÉTAPE 5: Confirmation et suite                                  │
├─────────────────────────────────────────────────────────────────┤
│ Message: "✅ Informations de la carte enregistrées"            │
│ Action: Activation du bouton "Analyser" (déjà existant)        │
│ Suite: Flux normal vers analyse et résultats                    │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2. Composants à créer

#### 2.1. `CardIdentificationBanner.tsx`

**Rôle**: Afficher le résultat de l'identification automatique

**Props:**
```typescript
interface CardIdentificationBannerProps {
  identification: CardIdentification | null;
  isIdentifying: boolean;
  onEdit: () => void;
}
```

**États visuels:**
```typescript
// État 1: Loading
<div className="p-4 bg-blue-50 border border-blue-200 rounded-xl animate-pulse">
  <div className="flex items-center gap-3">
    <Spinner size="sm" />
    <p>Identification de la carte en cours...</p>
  </div>
</div>

// État 2: Haute confiance (>= 0.7)
<div className="p-4 bg-green-50 border-2 border-green-300 rounded-xl">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <span className="text-2xl">🎯</span>
      <div>
        <p className="font-semibold text-green-800">
          Carte détectée
        </p>
        <p className="text-sm text-green-700">
          {cardName} - {cardSet} ({cardYear})
        </p>
      </div>
    </div>
    <button onClick={onEdit} className="text-green-700 underline text-sm">
      Modifier
    </button>
  </div>
</div>

// État 3: Confiance moyenne (0.3 - 0.7)
<div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
  <div className="flex items-center gap-3">
    <span className="text-2xl">⚠️</span>
    <div className="flex-1">
      <p className="font-semibold text-yellow-800">
        Carte détectée (incertaine)
      </p>
      <p className="text-sm text-yellow-700">
        {cardName} - {cardSet}
      </p>
      <p className="text-xs text-yellow-600 mt-1">
        Veuillez vérifier les informations ci-dessus
      </p>
    </div>
    <button
      onClick={onEdit}
      className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium"
    >
      Vérifier
    </button>
  </div>
</div>

// État 4: Échec identification (< 0.3)
<div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl">
  <div className="flex items-center gap-3">
    <span className="text-2xl">❌</span>
    <div className="flex-1">
      <p className="font-semibold text-red-800">
        Impossible d'identifier la carte
      </p>
      <p className="text-sm text-red-700">
        Cliquez pour rechercher manuellement
      </p>
    </div>
    <button
      onClick={onEdit}
      className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium"
    >
      Rechercher
    </button>
  </div>
</div>
```

**Logique interne:**
```typescript
const getConfidenceLevel = (confidence: number) => {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.3) return 'medium';
  return 'low';
};
```

---

#### 2.2. `CardInfoEditor.tsx`

**Rôle**: Modal permettant de rechercher/corriger les informations de la carte

**Props:**
```typescript
interface CardInfoEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (info: UpdateCardInfoDto) => Promise<void>;
  initialData?: Partial<UpdateCardInfoDto>;
  isSaving: boolean;
}
```

**Structure du modal:**
```typescript
<Modal isOpen={isOpen} onClose={onClose} size="lg">
  <div className="p-6">
    {/* Header */}
    <h2 className="text-xl font-bold mb-4">
      Informations de la carte
    </h2>

    {/* Form */}
    <form onSubmit={handleSubmit}>
      {/* Champ cardName avec auto-complétion */}
      <CardAutoCompleteInput
        label="Nom de la carte"
        placeholder="Ex: Pikachu"
        value={cardName}
        onChange={setCardName}
        onSelect={(card) => {
          setCardName(card.name);
          setCardSet(card.set);
          setCardYear(card.year);
        }}
      />

      {/* Champ cardSet */}
      <Input
        label="Set"
        placeholder="Ex: Base Set"
        value={cardSet}
        onChange={(e) => setCardSet(e.target.value)}
      />

      {/* Champ cardYear */}
      <Input
        type="number"
        label="Année"
        placeholder="Ex: 1999"
        value={cardYear}
        onChange={(e) => setCardYear(Number(e.target.value))}
      />

      {/* Preview si carte trouvée */}
      {selectedCard && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Aperçu:</p>
          <div className="flex items-center gap-3 mt-2">
            {selectedCard.imageUrl && (
              <img
                src={selectedCard.imageUrl}
                alt={selectedCard.name}
                className="w-16 h-20 object-cover rounded"
              />
            )}
            <div>
              <p className="font-medium">{selectedCard.name}</p>
              <p className="text-sm text-gray-500">{selectedCard.set}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="flex-1 py-2 border border-gray-300 rounded-lg"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSaving || !cardName}
          className="flex-1 py-2 bg-blue-600 text-white rounded-lg"
        >
          {isSaving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  </div>
</Modal>
```

---

#### 2.3. `CardAutoCompleteInput.tsx`

**Rôle**: Input avec auto-complétion basée sur l'API TCGdex

**Props:**
```typescript
interface CardAutoCompleteInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (card: CardSearchResult) => void;
}
```

**Structure:**
```typescript
<div className="relative">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    {label}
  </label>

  <input
    type="text"
    value={value}
    onChange={handleChange}
    onFocus={() => setShowDropdown(true)}
    placeholder={placeholder}
    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
  />

  {/* Dropdown résultats */}
  {showDropdown && results.length > 0 && (
    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
      {isSearching ? (
        <div className="p-3 text-center text-gray-500">
          <Spinner size="sm" />
          <span className="ml-2">Recherche...</span>
        </div>
      ) : (
        results.map((card) => (
          <button
            key={card.id}
            onClick={() => {
              onSelect(card);
              setShowDropdown(false);
            }}
            className="w-full p-3 hover:bg-gray-100 flex items-center gap-3 text-left"
          >
            {card.imageUrl && (
              <img
                src={card.imageUrl}
                alt={card.name}
                className="w-10 h-14 object-cover rounded"
              />
            )}
            <div>
              <p className="font-medium">{card.name}</p>
              <p className="text-sm text-gray-500">
                {card.set} • {card.year}
              </p>
            </div>
          </button>
        ))
      )}
    </div>
  )}
</div>
```

**Logique de recherche (debounced):**
```typescript
const [searchTerm, setSearchTerm] = useState('');
const [results, setResults] = useState<CardSearchResult[]>([]);
const [isSearching, setIsSearching] = useState(false);

// Debounce de 300ms
useEffect(() => {
  if (searchTerm.length < 2) {
    setResults([]);
    return;
  }

  const timer = setTimeout(async () => {
    setIsSearching(true);
    try {
      const data = await searchCards(searchTerm);
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, 300);

  return () => clearTimeout(timer);
}, [searchTerm]);
```

---

### 3. Modifications des pages existantes

#### 3.1. Page `/mobile/[sessionId]/page.tsx`

**Changements à apporter:**

```typescript
// Ajout d'états
const [identification, setIdentification] = useState<CardIdentification | null>(null);
const [isIdentifying, setIsIdentifying] = useState(false);
const [showCardEditor, setShowCardEditor] = useState(false);

// Hook personnalisé
const {
  identify,
  updateCardInfo,
  isIdentifying,
  error: identifyError
} = useCardIdentification(sessionId);

// Déclencher l'identification après upload des 2 images
useEffect(() => {
  const shouldIdentify =
    frontImage &&
    backImage &&
    !identification &&
    !isIdentifying;

  if (shouldIdentify) {
    handleAutoIdentify();
  }
}, [frontImage, backImage]);

const handleAutoIdentify = async () => {
  try {
    const result = await identify();
    setIdentification(result);
  } catch (err) {
    console.error('Identification failed:', err);
    // Afficher erreur mais ne pas bloquer l'UX
  }
};

const handleSaveCardInfo = async (info: UpdateCardInfoDto) => {
  await updateCardInfo(info);
  setIdentification({
    ...identification!,
    cardName: info.cardName || identification!.cardName,
    cardSet: info.cardSet,
    cardYear: info.cardYear,
    confidence: 1, // Correction manuelle = confiance max
  });
  setShowCardEditor(false);
};
```

**Ajout dans le JSX (après les ImageUploaders):**
```typescript
{/* Card Identification Banner */}
{(frontImage && backImage) && (
  <div className="mb-6">
    <CardIdentificationBanner
      identification={identification}
      isIdentifying={isIdentifying}
      onEdit={() => setShowCardEditor(true)}
    />
  </div>
)}

{/* Card Info Editor Modal */}
<CardInfoEditor
  isOpen={showCardEditor}
  onClose={() => setShowCardEditor(false)}
  onSave={handleSaveCardInfo}
  initialData={{
    cardName: identification?.cardName,
    cardSet: identification?.cardSet,
    cardYear: identification?.cardYear,
  }}
  isSaving={false}
/>
```

---

### 4. Nouveaux hooks

#### 4.1. `useCardIdentification.ts`

```typescript
'use client';

import { useState } from 'react';
import { identifyCard, updateSessionCardInfo } from '@/lib/api';
import { CardIdentification, UpdateCardInfoDto } from '@/lib/types';

interface UseCardIdentificationReturn {
  identification: CardIdentification | null;
  isIdentifying: boolean;
  error: string | null;
  identify: () => Promise<CardIdentification>;
  updateCardInfo: (info: UpdateCardInfoDto) => Promise<void>;
  reset: () => void;
}

export function useCardIdentification(
  sessionId: string,
  userId: number = 1
): UseCardIdentificationReturn {
  const [identification, setIdentification] = useState<CardIdentification | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identify = async (): Promise<CardIdentification> => {
    setIsIdentifying(true);
    setError(null);

    try {
      const result = await identifyCard(sessionId, userId);
      setIdentification(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur identification';
      setError(message);
      throw err;
    } finally {
      setIsIdentifying(false);
    }
  };

  const updateCardInfo = async (info: UpdateCardInfoDto): Promise<void> => {
    setError(null);

    try {
      await updateSessionCardInfo(sessionId, userId, info);
      // Mettre à jour l'état local
      if (identification) {
        setIdentification({
          ...identification,
          cardName: info.cardName || identification.cardName,
          cardSet: info.cardSet,
          cardYear: info.cardYear,
          confidence: 1, // Correction manuelle = haute confiance
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur mise à jour';
      setError(message);
      throw err;
    }
  };

  const reset = () => {
    setIdentification(null);
    setError(null);
  };

  return {
    identification,
    isIdentifying,
    error,
    identify,
    updateCardInfo,
    reset,
  };
}
```

---

### 5. Nouveaux types TypeScript

**Ajouts dans `apps/web/src/lib/types.ts`:**

```typescript
// Phase 2B - Card Identification
export interface CardIdentification {
  cardName: string;
  cardSet?: string;
  cardYear?: number;
  cardType?: string;
  cardNumber?: string;
  confidence: number; // 0-1
  method: 'ocr' | 'visual' | 'hybrid' | 'manual';
  extractedText?: string[]; // Texte brut OCR
}

export interface UpdateCardInfoDto {
  cardName?: string;
  cardSet?: string;
  cardYear?: number;
  cardType?: string;
}

export interface CardSearchResult {
  id: string;
  name: string;
  set: string;
  year?: number;
  type?: string;
  imageUrl?: string;
  number?: string;
}
```

---

### 6. Nouveaux appels API

**Ajouts dans `apps/web/src/lib/api.ts`:**

```typescript
// Card Identification API

export async function identifyCard(
  sessionId: string,
  userId: number
): Promise<CardIdentification> {
  return fetchApi<CardIdentification>(
    `/sessions/${sessionId}/identify?userId=${userId}`,
    { method: 'POST' }
  );
}

export async function updateSessionCardInfo(
  sessionId: string,
  userId: number,
  data: UpdateCardInfoDto
): Promise<Session> {
  return fetchApi<Session>(
    `/sessions/${sessionId}?userId=${userId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
}

// Card Search API (pour auto-complétion)

export async function searchCards(
  query: string,
  limit: number = 10
): Promise<CardSearchResult[]> {
  return fetchApi<CardSearchResult[]>(
    `/cards/search?query=${encodeURIComponent(query)}&limit=${limit}`
  );
}
```

---

### 7. Gestion des états

**Diagramme des états:**

```
┌─────────────┐
│   IDLE      │ (Pas d'images uploadées)
└──────┬──────┘
       │
       │ Upload image 1
       ↓
┌─────────────┐
│  UPLOADING  │ (1 image uploadée)
└──────┬──────┘
       │
       │ Upload image 2
       ↓
┌──────────────┐
│ IDENTIFYING  │ (Identification automatique en cours)
└──────┬───────┘
       │
       ├─ Success (confidence >= 0.7) ──→ ┌───────────────┐
       │                                   │  IDENTIFIED   │
       │                                   │  (haute conf) │
       │                                   └───────────────┘
       │
       ├─ Partial (0.3 <= conf < 0.7) ──→ ┌───────────────┐
       │                                   │  UNCERTAIN    │
       │                                   │ (vérif requis)│
       │                                   └───────────────┘
       │
       └─ Failure (conf < 0.3) ─────────→ ┌───────────────┐
                                           │    FAILED     │
                                           │(recherche man)│
                                           └───────────────┘
```

**Gestion des erreurs:**

```typescript
// Type d'erreurs possibles
type IdentificationErrorType =
  | 'NETWORK_ERROR'      // Erreur réseau
  | 'API_ERROR'          // Erreur API backend
  | 'ML_ERROR'           // Erreur service ML
  | 'NO_TEXT_FOUND'      // Aucun texte détecté
  | 'UNKNOWN_ERROR';     // Erreur inconnue

// Message utilisateur selon le type
const getErrorMessage = (type: IdentificationErrorType): string => {
  switch (type) {
    case 'NETWORK_ERROR':
      return 'Erreur de connexion. Vérifiez votre réseau.';
    case 'NO_TEXT_FOUND':
      return 'Aucun texte détecté sur la carte. Recherche manuelle requise.';
    case 'ML_ERROR':
      return "Erreur lors de l'analyse. Veuillez réessayer.";
    default:
      return "Une erreur est survenue. Vous pouvez rechercher la carte manuellement.";
  }
};
```

---

### 8. Responsive & Mobile-first

**Breakpoints Tailwind:**
- Mobile: `< 640px` (par défaut)
- Tablet: `sm:` (640px+)
- Desktop: `md:` (768px+)

**Considérations:**
- Les modals doivent être fullscreen sur mobile (`< 640px`)
- Les inputs doivent être assez larges pour le touch (min 44px hauteur)
- L'auto-complétion doit être scrollable et ne pas déborder
- Les images preview doivent être optimisées (lazy loading)

**Exemple responsive modal:**
```typescript
<Modal
  className="
    fixed inset-0 z-50
    sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
    sm:max-w-lg sm:rounded-xl
    w-full h-full sm:h-auto
    bg-white
  "
>
  {/* Content */}
</Modal>
```

---

## Phase 2C - Prix en temps réel

### Objectif
Afficher une estimation du prix de la carte en fonction du grade obtenu, avec fourchettes de prix et liens vers marketplaces.

---

### 1. User Flow détaillé

```
┌─────────────────────────────────────────────────────────────────┐
│ PRÉREQUIS: Carte identifiée + Grade calculé                     │
├─────────────────────────────────────────────────────────────────┤
│ Page: /mobile/[sessionId]/results                               │
│                                                                  │
│ ┌─────────────────────┐                                         │
│ │  GradeResultCard    │ ← Composant existant                   │
│ │  Note: 8.5/10 (NM)  │                                         │
│ └─────────────────────┘                                         │
│           ↓                                                      │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 💰 Valeur estimée                                          │ │
│ │                                                             │ │
│ │ État 1: LOADING                                             │ │
│ │ ┌────────────────────────────────┐                         │ │
│ │ │ 🔄 Récupération des prix...    │                         │ │
│ │ │ (Spinner + texte)              │                         │ │
│ │ └────────────────────────────────┘                         │ │
│ │                                                             │ │
│ │ État 2: SUCCESS                                             │ │
│ │ ┌──────────────────────────────────────────────────────┐  │ │
│ │ │ 💰 Valeur estimée                                   │  │ │
│ │ │                                                       │  │ │
│ │ │ Pour un grade NM (8-9):                              │  │ │
│ │ │ ┌────────────────────────────────┐                  │  │ │
│ │ │ │ 45€ - 65€                      │ ← Prix principal │  │ │
│ │ │ │ Prix moyen: 55€                │                  │  │ │
│ │ │ └────────────────────────────────┘                  │  │ │
│ │ │                                                       │  │ │
│ │ │ Sources:                                             │  │ │
│ │ │ • Cardmarket: 52€ [Voir l'offre →]                  │  │ │
│ │ │ • TCGPlayer:  58€ [Voir l'offre →]                  │  │ │
│ │ │ • TCGdex:     55€ [Voir l'offre →]                  │  │ │
│ │ │                                                       │  │ │
│ │ │ 📊 Prix par grade:                                   │  │ │
│ │ │ ┌────┬─────────┬─────────┐                          │  │ │
│ │ │ │ 10 │  150€   │ GEM MT  │                          │  │ │
│ │ │ │  9 │   80€   │ MINT    │                          │  │ │
│ │ │ │  8 │   55€   │ NM-MT   │ ← Note actuelle         │  │ │
│ │ │ │  7 │   35€   │ NM      │                          │  │ │
│ │ │ │  6 │   20€   │ EX-MT   │                          │  │ │
│ │ │ └────┴─────────┴─────────┘                          │  │ │
│ │ │                                                       │  │ │
│ │ │ ℹ️ Prix indicatifs, peuvent varier selon le marché │  │ │
│ │ └──────────────────────────────────────────────────────┘  │ │
│ │                                                             │ │
│ │ État 3: ERROR                                               │ │
│ │ ┌────────────────────────────────┐                         │ │
│ │ │ ⚠️ Prix indisponible           │                         │ │
│ │ │ Impossible de récupérer les    │                         │ │
│ │ │ prix pour cette carte.         │                         │ │
│ │ └────────────────────────────────┘                         │ │
│ │                                                             │ │
│ │ État 4: NO_CARD_INFO                                        │ │
│ │ ┌────────────────────────────────┐                         │ │
│ │ │ ℹ️ Identification requise      │                         │ │
│ │ │ Identifiez la carte pour voir  │                         │ │
│ │ │ son prix estimé.               │                         │ │
│ │ └────────────────────────────────┘                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2. Composants à créer

#### 2.1. `PriceEstimation.tsx`

**Rôle**: Composant principal affichant l'estimation de prix

**Props:**
```typescript
interface PriceEstimationProps {
  cardName: string;
  cardSet?: string;
  grade: number;
  gradeLabel: string;
}
```

**Structure:**
```typescript
export function PriceEstimation({
  cardName,
  cardSet,
  grade,
  gradeLabel
}: PriceEstimationProps) {
  const { pricing, isLoading, error } = useCardPrice(cardName, cardSet, grade);

  // État 4: Pas d'infos carte
  if (!cardName) {
    return (
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <p className="font-medium text-blue-800">
              Identification requise
            </p>
            <p className="text-sm text-blue-600">
              Identifiez la carte pour voir son prix estimé
            </p>
          </div>
        </div>
      </div>
    );
  }

  // État 1: Loading
  if (isLoading) {
    return (
      <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center gap-3 py-8">
          <Spinner size="md" />
          <p className="text-gray-600">Récupération des prix...</p>
        </div>
      </div>
    );
  }

  // État 3: Error
  if (error || !pricing) {
    return (
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-medium text-yellow-800">
              Prix indisponible
            </p>
            <p className="text-sm text-yellow-600">
              Impossible de récupérer les prix pour cette carte
            </p>
          </div>
        </div>
      </div>
    );
  }

  // État 2: Success
  return (
    <div className="mt-6 bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span>💰</span>
          Valeur estimée
        </h3>
      </div>

      <div className="p-6 space-y-6">
        {/* Prix principal */}
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Pour un grade {gradeLabel} ({Math.floor(grade)}/10):
          </p>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-800">
              {pricing.priceRange.min}€ - {pricing.priceRange.max}€
            </p>
            <p className="text-sm text-green-600 mt-1">
              Prix moyen: {pricing.priceRange.avg}€
            </p>
          </div>
        </div>

        {/* Sources */}
        {pricing.sources.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Sources:
            </p>
            <div className="space-y-2">
              {pricing.sources.map((source) => (
                <PriceSourceBadge key={source.source} source={source} />
              ))}
            </div>
          </div>
        )}

        {/* Tableau prix par grade */}
        {pricing.pricesByGrade && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span>📊</span>
              Prix par grade:
            </p>
            <PriceGradeTable
              pricesByGrade={pricing.pricesByGrade}
              currentGrade={Math.floor(grade)}
            />
          </div>
        )}

        {/* Disclaimer */}
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 flex items-center gap-2">
            <span>ℹ️</span>
            Prix indicatifs, peuvent varier selon le marché et la disponibilité
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Dernière mise à jour: {new Date(pricing.lastUpdated).toLocaleString('fr-FR')}
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

#### 2.2. `PriceSourceBadge.tsx`

**Rôle**: Badge affichant le prix d'une source (marketplace)

**Props:**
```typescript
interface PriceSourceBadgeProps {
  source: PriceSource;
}
```

**Structure:**
```typescript
const sourceIcons = {
  tcgdex: '🃏',
  cardmarket: '🛒',
  tcgplayer: '🎯',
};

const sourceLabels = {
  tcgdex: 'TCGdex',
  cardmarket: 'Cardmarket',
  tcgplayer: 'TCGPlayer',
};

export function PriceSourceBadge({ source }: PriceSourceBadgeProps) {
  const icon = sourceIcons[source.source];
  const label = sourceLabels[source.source];

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="font-medium text-gray-800">{label}</p>
          {source.availability && (
            <p className="text-xs text-gray-500">
              {source.availability === 'in_stock' ? '✅ En stock' : '❌ Rupture'}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <p className="text-lg font-bold text-gray-900">
          {source.price}€
        </p>
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
          >
            Voir
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
```

---

#### 2.3. `PriceGradeTable.tsx`

**Rôle**: Tableau comparatif des prix par grade

**Props:**
```typescript
interface PriceGradeTableProps {
  pricesByGrade: Record<number, number>; // grade -> price
  currentGrade: number;
}
```

**Structure:**
```typescript
const gradeLabels: Record<number, string> = {
  10: 'GEM MT',
  9: 'MINT',
  8: 'NM-MT',
  7: 'NM',
  6: 'EX-MT',
  5: 'EX',
  4: 'VG-EX',
  3: 'VG',
  2: 'GOOD',
  1: 'POOR',
};

export function PriceGradeTable({ pricesByGrade, currentGrade }: PriceGradeTableProps) {
  // Trier par grade décroissant
  const sortedGrades = Object.keys(pricesByGrade)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
              Grade
            </th>
            <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">
              Prix
            </th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
              État
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedGrades.map((grade) => {
            const isCurrent = grade === currentGrade;
            return (
              <tr
                key={grade}
                className={`
                  ${isCurrent ? 'bg-green-50 font-medium' : 'bg-white'}
                  hover:bg-gray-50 transition-colors
                `}
              >
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    {isCurrent && <span className="text-green-600">👉</span>}
                    <span className={isCurrent ? 'text-green-800' : 'text-gray-900'}>
                      {grade}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <span className={`font-semibold ${isCurrent ? 'text-green-800' : 'text-gray-900'}`}>
                    {pricesByGrade[grade]}€
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {gradeLabels[grade]}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

---

### 3. Modifications des pages existantes

#### 3.1. Page `/mobile/[sessionId]/results/page.tsx`

**Ajout après le `GradeResultCard`:**

```typescript
{/* Price Estimation - Conditionnel */}
{result && session?.cardName && (
  <PriceEstimation
    cardName={session.cardName}
    cardSet={session.cardSet}
    grade={result.finalGrade}
    gradeLabel={result.gradeLabel}
  />
)}
```

**Besoin d'accéder aux infos de session:**
```typescript
// Ajouter au début du composant
const { session } = useSession(sessionId);

// Ou alternativement, stocker cardName/cardSet dans les résultats
// (nécessite modification backend)
```

---

### 4. Nouveaux hooks

#### 4.1. `useCardPrice.ts`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { getCardPricing } from '@/lib/api';
import { CardPricing } from '@/lib/types';

interface UseCardPriceReturn {
  pricing: CardPricing | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCardPrice(
  cardName?: string,
  cardSet?: string,
  grade?: number
): UseCardPriceReturn {
  const [pricing, setPricing] = useState<CardPricing | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPricing = async () => {
    if (!cardName) {
      setPricing(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getCardPricing(cardName, cardSet, grade);
      setPricing(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur prix';
      setError(message);
      console.error('Price fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, [cardName, cardSet, grade]);

  return {
    pricing,
    isLoading,
    error,
    refetch: fetchPricing,
  };
}
```

---

### 5. Nouveaux types TypeScript

**Ajouts dans `apps/web/src/lib/types.ts`:**

```typescript
// Phase 2C - Card Pricing

export interface CardPricing {
  cardName: string;
  cardSet?: string;
  currency: string; // 'EUR', 'USD'
  priceRange: {
    min: number;
    max: number;
    avg: number;
  };
  sources: PriceSource[];
  pricesByGrade?: Record<number, number>; // grade -> price
  lastUpdated: string;
}

export interface PriceSource {
  source: 'tcgdex' | 'cardmarket' | 'tcgplayer';
  price: number;
  url?: string;
  availability?: 'in_stock' | 'out_of_stock' | 'unknown';
}
```

---

### 6. Nouveaux appels API

**Ajouts dans `apps/web/src/lib/api.ts`:**

```typescript
// Card Pricing API

export async function getCardPricing(
  cardName: string,
  cardSet?: string,
  grade?: number
): Promise<CardPricing> {
  const params = new URLSearchParams({
    name: cardName,
    ...(cardSet && { set: cardSet }),
    ...(grade && { grade: Math.floor(grade).toString() }),
  });

  return fetchApi<CardPricing>(`/cards/pricing?${params}`);
}
```

---

### 7. Gestion des états

**États du composant PriceEstimation:**

```typescript
type PriceEstimationState =
  | 'NO_CARD_INFO'   // Carte non identifiée
  | 'LOADING'        // Chargement des prix
  | 'SUCCESS'        // Prix récupérés avec succès
  | 'ERROR'          // Erreur lors de la récupération
  | 'PARTIAL';       // Succès partiel (certaines sources indispo)
```

**Gestion des erreurs API:**

```typescript
// Types d'erreurs pricing
type PricingErrorType =
  | 'NETWORK_ERROR'        // Erreur réseau
  | 'API_TIMEOUT'          // Timeout APIs externes
  | 'NO_PRICING_DATA'      // Aucune donnée prix trouvée
  | 'CARD_NOT_FOUND'       // Carte inconnue sur marketplaces
  | 'RATE_LIMIT_EXCEEDED'  // Quota API externe dépassé
  | 'UNKNOWN_ERROR';

const getPricingErrorMessage = (type: PricingErrorType): string => {
  switch (type) {
    case 'NETWORK_ERROR':
      return 'Erreur de connexion lors de la récupération des prix.';
    case 'API_TIMEOUT':
      return 'Les APIs de pricing ne répondent pas. Réessayez plus tard.';
    case 'NO_PRICING_DATA':
      return 'Aucun prix trouvé pour cette carte.';
    case 'CARD_NOT_FOUND':
      return 'Cette carte est introuvable sur les marketplaces.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Limite de requêtes atteinte. Réessayez dans quelques minutes.';
    default:
      return 'Impossible de récupérer les prix pour le moment.';
  }
};
```

**Fallback gracieux:**
```typescript
// Si une seule source fonctionne, afficher quand même
if (pricing.sources.length === 1) {
  return (
    <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-700">
          ℹ️ Prix disponible sur une seule source
        </p>
      </div>
      {/* Reste du composant */}
    </div>
  );
}
```

---

### 8. Responsive & Performance

**Responsive Design:**
```typescript
// Mobile: Stack vertical
<div className="space-y-4">
  <PriceRange />
  <PriceSources />
  <PriceGradeTable />
</div>

// Desktop: Grid 2 colonnes
<div className="md:grid md:grid-cols-2 md:gap-6 space-y-4 md:space-y-0">
  <div className="md:col-span-2">
    <PriceRange />
  </div>
  <PriceSources />
  <PriceGradeTable />
</div>
```

**Optimisations:**
1. **Cache côté client**: Stocker le résultat dans sessionStorage pendant 5 minutes
2. **Lazy loading**: Ne charger le composant que si visible (Intersection Observer)
3. **Debounce**: Si grade change, attendre 500ms avant refetch
4. **Retry logic**: Réessayer une fois en cas d'erreur timeout

```typescript
// Cache simple
const CACHE_KEY = `pricing_${cardName}_${cardSet}_${grade}`;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedPricing = (): CardPricing | null => {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const setCachedPricing = (data: CardPricing) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {
    // Ignore
  }
};
```

---

## Considérations transversales

### 1. Tests à prévoir

#### Tests unitaires (Jest + React Testing Library)
```typescript
// CardIdentificationBanner.test.tsx
describe('CardIdentificationBanner', () => {
  it('affiche loading pendant identification', () => {});
  it('affiche succès avec haute confiance', () => {});
  it('affiche avertissement avec confiance moyenne', () => {});
  it('affiche échec avec basse confiance', () => {});
  it('appelle onEdit au clic sur Modifier', () => {});
});

// PriceEstimation.test.tsx
describe('PriceEstimation', () => {
  it('affiche message si carte non identifiée', () => {});
  it('affiche loading pendant récupération', () => {});
  it('affiche prix avec toutes les sources', () => {});
  it('affiche tableau prix par grade', () => {});
  it('affiche erreur si échec API', () => {});
});
```

#### Tests E2E (Playwright)
```typescript
// e2e/card-identification.spec.ts
test('identification automatique après upload', async ({ page }) => {
  // Upload 2 images
  // Vérifier apparition banner identification
  // Vérifier possibilité de modifier
  // Enregistrer modification
  // Vérifier mise à jour des infos
});

// e2e/pricing.spec.ts
test('affichage prix après analyse', async ({ page }) => {
  // Compléter analyse
  // Vérifier section prix visible
  // Vérifier affichage sources
  // Vérifier tableau grades
  // Cliquer lien externe marketplace
});
```

---

### 2. Accessibilité (a11y)

**ARIA labels:**
```typescript
// CardIdentificationBanner
<div
  role="status"
  aria-live="polite"
  aria-label="Résultat identification"
>
  {/* Content */}
</div>

// PriceEstimation
<section aria-labelledby="price-heading">
  <h3 id="price-heading">Valeur estimée</h3>
  {/* Content */}
</section>
```

**Keyboard navigation:**
- Tous les boutons accessibles au clavier (Tab)
- Modals fermables avec Escape
- Auto-complétion navigable avec flèches (↑/↓) et Enter

**Screen readers:**
- Messages de loading annoncés
- Erreurs annoncées
- Changements de prix annoncés

---

### 3. Analytics & Tracking

**Événements à tracker:**
```typescript
// Phase 2B
trackEvent('card_identification_started');
trackEvent('card_identification_success', { confidence, method });
trackEvent('card_identification_failed', { reason });
trackEvent('card_info_edited', { field });
trackEvent('card_search_used', { query, resultsCount });

// Phase 2C
trackEvent('pricing_displayed', { cardName, grade, sourcesCount });
trackEvent('pricing_failed', { error });
trackEvent('marketplace_link_clicked', { source });
trackEvent('grade_table_viewed');
```

---

### 4. SEO (non applicable pour app mobile)

L'app mobile n'est pas indexée (session-based), mais pour référence:
- Pas besoin de metadata dynamique
- Pas besoin de sitemap
- Utiliser `noindex` sur toutes les pages `/mobile/*`

---

### 5. Erreurs courantes à éviter

#### Phase 2B
❌ **Ne pas déclencher l'identification tant que les 2 images ne sont pas uploadées**
```typescript
// Mauvais
useEffect(() => {
  if (frontImage) identify(); // ❌ Déclenché trop tôt
}, [frontImage]);

// Bon
useEffect(() => {
  if (frontImage && backImage && !identification) {
    identify(); // ✅ Attend les 2 images
  }
}, [frontImage, backImage]);
```

❌ **Ne pas bloquer l'analyse si identification échoue**
```typescript
// L'utilisateur doit pouvoir analyser même si OCR échoue
<AnalyzeButton
  disabled={!frontImage || !backImage} // ✅ Pas de dépendance sur identification
/>
```

❌ **Ne pas oublier de gérer les doublons de recherche**
```typescript
// Debounce obligatoire sur auto-complétion
const debouncedSearch = useMemo(
  () => debounce((query) => searchCards(query), 300),
  []
);
```

#### Phase 2C
❌ **Ne pas afficher le prix si carte non identifiée**
```typescript
// Vérifier cardName avant d'afficher PriceEstimation
{session?.cardName && <PriceEstimation {...} />}
```

❌ **Ne pas exposer les API keys côté client**
```typescript
// Toutes les API keys doivent être côté backend
// ❌ NEXT_PUBLIC_CARDMARKET_KEY (exposé)
// ✅ CARDMARKET_API_KEY (backend only)
```

❌ **Ne pas oublier le cache**
```typescript
// Sans cache, chaque visite = nouvelle requête API
// Implémenter cache côté client (5 min) + backend (1h)
```

---

## Résumé des livrables

### Phase 2B - Reconnaissance de carte

**Composants créés:**
1. `CardIdentificationBanner.tsx` - Affichage résultat identification
2. `CardInfoEditor.tsx` - Modal édition/recherche manuelle
3. `CardAutoCompleteInput.tsx` - Input avec auto-complétion

**Hooks créés:**
1. `useCardIdentification.ts` - Gestion identification et mise à jour

**Types ajoutés:**
1. `CardIdentification`
2. `UpdateCardInfoDto`
3. `CardSearchResult`

**API ajoutées:**
1. `identifyCard()`
2. `updateSessionCardInfo()`
3. `searchCards()`

**Modifications:**
1. `/mobile/[sessionId]/page.tsx` - Intégration identification

---

### Phase 2C - Prix en temps réel

**Composants créés:**
1. `PriceEstimation.tsx` - Composant principal prix
2. `PriceSourceBadge.tsx` - Badge par marketplace
3. `PriceGradeTable.tsx` - Tableau comparatif grades

**Hooks créés:**
1. `useCardPrice.ts` - Récupération et cache prix

**Types ajoutés:**
1. `CardPricing`
2. `PriceSource`

**API ajoutées:**
1. `getCardPricing()`

**Modifications:**
1. `/mobile/[sessionId]/results/page.tsx` - Intégration pricing

---

## Timeline de développement

**Phase 2B - Reconnaissance (4-5 jours):**
- Jour 1: Composants UI (Banner, Editor, AutoComplete)
- Jour 2: Hook useCardIdentification + Types
- Jour 3: Intégration dans page upload + API client
- Jour 4: Tests unitaires + E2E
- Jour 5: Polish, fixes, optimisations

**Phase 2C - Pricing (3-4 jours):**
- Jour 1: Composants UI (Estimation, Badges, Table)
- Jour 2: Hook useCardPrice + Cache + Types
- Jour 3: Intégration dans page results + API client
- Jour 4: Tests + Gestion erreurs + Polish

**Total estimé: 7-9 jours de développement frontend**

---

## Dépendances backend requises

### Phase 2B
- ✅ Endpoint `POST /sessions/:id/identify`
- ✅ Endpoint `PATCH /sessions/:id` (update card info)
- ✅ Endpoint `GET /cards/search` (TCGdex integration)
- ✅ Service ML avec OCR (Tesseract)

### Phase 2C
- ✅ Endpoint `GET /cards/pricing`
- ✅ Intégrations APIs externes (Cardmarket, TCGPlayer, TCGdex)
- ✅ Cache Redis (recommandé)
- ✅ Rate limiting configuré

---

## Notes finales

**Principes de design:**
- Mobile-first (tout doit fonctionner sur petit écran)
- Progressive disclosure (ne montrer que ce qui est pertinent)
- Feedback immédiat (loading states, animations)
- Graceful degradation (gérer les échecs d'API)

**Règles métier:**
- L'identification est optionnelle, ne bloque pas l'analyse
- Les prix sont indicatifs, toujours afficher disclaimer
- La correction manuelle override l'identification automatique
- Les données de session sont éphémères (pas de login)

**Optimisations futures (Phase 3):**
- Reconnaissance visuelle CLIP en complément OCR
- Machine learning pour améliorer pricing (tendances)
- Historique des prix dans le temps (graphiques)
- Alertes de prix (si implémentation comptes utilisateurs)

---

**Plan créé le**: 2026-01-12
**Dernière modification**: 2026-01-12
**Status**: ✅ Complet et prêt pour implémentation
