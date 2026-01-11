# Plan d'implémentation - Interface Web Next.js MVP

> **Agent**: nextjs-expert-agent
> **Date**: 2026-01-11
> **Version**: 1.0

---

## 1. Vue d'ensemble

### Objectif
Créer une interface web Next.js 14+ (App Router) permettant à un utilisateur desktop de démarrer une session de grading via QR code, qui sera scannée par un téléphone mobile pour upload des photos et consultation des résultats.

### Workflow utilisateur

```
[Desktop] Page principale → Génère session → Affiche QR code avec URL mobile
                ↓
[Mobile] Scan QR → Page mobile → Upload FRONT + BACK → Lance analyse → Affiche résultats
```

### Contraintes MVP
- ✅ Pas d'authentification (session anonyme)
- ✅ Design simple avec Tailwind CSS
- ✅ Mobile-first responsive
- ✅ QR code généré côté client
- ✅ Pas de synchronisation temps réel (polling simple ou standalone mobile)

---

## 2. Architecture des pages/routes

### Structure des routes (App Router)

```
src/app/
├── layout.tsx                    # Layout racine (metadata, fonts, Tailwind)
├── page.tsx                      # Page principale desktop (QR code)
├── globals.css                   # Styles Tailwind globaux
├── mobile/
│   └── [sessionId]/
│       ├── page.tsx              # Page mobile - Upload & Analyse
│       └── results/
│           └── page.tsx          # Page mobile - Résultats
└── api/                          # Routes API (optionnel, pour éviter CORS si nécessaire)
    └── sessions/
        └── route.ts              # Proxy vers l'API NestJS (optionnel)
```

### Description des pages

| Route | Vue | Responsabilité |
|-------|-----|----------------|
| `/` | Desktop | Création session + affichage QR code |
| `/mobile/[sessionId]` | Mobile | Upload des images FRONT/BACK + bouton Analyser |
| `/mobile/[sessionId]/results` | Mobile | Affichage des résultats de grading |

---

## 3. Architecture des composants

### Composants principaux

```
src/components/
├── desktop/
│   ├── QRCodeDisplay.tsx         # Affichage du QR code avec session ID
│   └── SessionInfo.tsx           # Info sur la session (statut, création)
├── mobile/
│   ├── ImageUploader.tsx         # Upload/capture photo (FRONT/BACK)
│   ├── AnalyzeButton.tsx         # Bouton pour lancer l'analyse
│   ├── GradeResultCard.tsx       # Carte d'affichage d'un résultat de grade
│   └── LoadingSpinner.tsx        # Indicateur de chargement
└── shared/
    ├── ErrorBoundary.tsx         # Gestion des erreurs React
    └── ErrorMessage.tsx          # Affichage des erreurs utilisateur
```

### Composants optionnels

```
src/components/shared/
├── Header.tsx                    # En-tête de l'application
└── Footer.tsx                    # Pied de page
```

---

## 4. Flow de données & API calls

### 4.1 Page Desktop `/`

**Cycle de vie:**

```typescript
useEffect(() => {
  // 1. Créer une session au chargement de la page
  const createSession = async () => {
    const response = await fetch('http://localhost:3000/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'anonymous', // Pas d'auth, user fixe
      })
    });
    const session = await response.json();
    setSessionId(session.id);
  };

  createSession();
}, []);
```

**Génération QR Code:**

```typescript
// URL à encoder dans le QR code
const mobileUrl = `${window.location.origin}/mobile/${sessionId}`;

// Utiliser qrcode.react pour générer le QR
<QRCodeSVG value={mobileUrl} size={256} />
```

**État:**
- `sessionId: string | null` - ID de la session créée
- `isLoading: boolean` - Chargement initial
- `error: string | null` - Erreur éventuelle

---

### 4.2 Page Mobile `/mobile/[sessionId]`

**Cycle de vie:**

```typescript
// 1. Récupérer le sessionId depuis l'URL
const params = useParams();
const sessionId = params.sessionId;

// 2. Vérifier que la session existe
useEffect(() => {
  const checkSession = async () => {
    const response = await fetch(`http://localhost:3000/sessions/${sessionId}`);
    if (!response.ok) {
      setError('Session introuvable');
      return;
    }
    const session = await response.json();
    setSession(session);

    // Charger les images existantes
    const imagesResponse = await fetch(`http://localhost:3000/sessions/${sessionId}/images`);
    const images = await imagesResponse.json();
    setUploadedImages(images);
  };

  checkSession();
}, [sessionId]);
```

**Upload d'images:**

```typescript
const handleImageUpload = async (file: File, side: 'FRONT' | 'BACK') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('side', side);

  const response = await fetch(`http://localhost:3000/sessions/${sessionId}/images`, {
    method: 'POST',
    body: formData,
  });

  const uploadedImage = await response.json();
  setUploadedImages(prev => [...prev, uploadedImage]);
};
```

**Lancer l'analyse:**

```typescript
const handleAnalyze = async () => {
  setIsAnalyzing(true);

  const response = await fetch(`http://localhost:3000/sessions/${sessionId}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scale: 'PCA', // ou 'PSA'
    })
  });

  if (response.ok) {
    // Rediriger vers la page des résultats
    router.push(`/mobile/${sessionId}/results`);
  } else {
    setError('Erreur lors de l\'analyse');
  }

  setIsAnalyzing(false);
};
```

**État:**
- `session: Session | null` - Données de la session
- `uploadedImages: SessionImage[]` - Images uploadées (FRONT/BACK)
- `isAnalyzing: boolean` - Analyse en cours
- `error: string | null` - Erreur éventuelle

---

### 4.3 Page Résultats `/mobile/[sessionId]/results`

**Cycle de vie:**

```typescript
useEffect(() => {
  const fetchResults = async () => {
    const response = await fetch(`http://localhost:3000/sessions/${sessionId}/results`);

    if (response.status === 404) {
      setError('Aucun résultat disponible. Lancez d\'abord l\'analyse.');
      return;
    }

    const results = await response.json();
    setGradeResult(results);
  };

  fetchResults();
}, [sessionId]);
```

**Affichage des résultats:**

```typescript
// Structure du résultat attendu (voir API)
interface GradeResult {
  id: string;
  sessionId: string;
  scale: 'PCA' | 'PSA';
  finalGrade: number;
  scores: {
    centering: number;
    corners: number;
    edges: number;
    surface: number;
    printQuality: number;
  };
  confidence: number;
  createdAt: string;
}
```

**État:**
- `gradeResult: GradeResult | null` - Résultats de grading
- `isLoading: boolean` - Chargement des résultats
- `error: string | null` - Erreur éventuelle

---

## 5. Gestion de la session (sans authentification)

### Stratégie de session

**Option retenue: Session côté serveur, pas de cookies/localStorage**

1. **Desktop:**
   - Créer la session via `POST /sessions` avec `userId: 'anonymous'`
   - Stocker `sessionId` dans le state React (pas de persistance)
   - Si l'utilisateur refresh, une nouvelle session est créée

2. **Mobile:**
   - Récupérer `sessionId` depuis l'URL (`/mobile/[sessionId]`)
   - Pas de stockage côté client
   - Si l'URL est valide, la session existe côté API

### Sécurité
- Les sessions sont publiques (pas d'auth)
- N'importe qui avec l'URL peut accéder à la session
- Pour le MVP, c'est acceptable (pas de données sensibles)

---

## 6. Synchronisation Desktop ↔ Mobile

### Option retenue: Standalone Mobile (pas de synchronisation temps réel)

**Justification:**
- Simplicité du MVP
- Pas besoin de WebSocket/Polling
- Le desktop affiche seulement le QR code
- Le mobile est autonome pour upload + résultats

**Flow:**
```
[Desktop] Crée session → Affiche QR code (statique)
[Mobile] Scan QR → Upload → Analyse → Résultats
```

**Évolution future (post-MVP):**
- Polling sur desktop pour afficher le statut de la session
- WebSocket pour synchronisation temps réel
- Affichage des résultats sur desktop également

---

## 7. Capture photo: Input file vs API caméra

### Option retenue: Input file natif avec accept="image/*" + capture

**Code:**

```tsx
<input
  type="file"
  accept="image/*"
  capture="environment" // Ouvre la caméra arrière sur mobile
  onChange={handleFileChange}
/>
```

**Avantages:**
- Fonctionne sur tous les navigateurs mobiles
- Pas besoin de permissions complexes
- L'utilisateur peut choisir: caméra ou galerie

**Alternative (API Camera):**
- Utiliser `navigator.mediaDevices.getUserMedia()`
- Plus complexe, nécessite permissions
- Meilleur contrôle (preview, résolution)
- **Post-MVP si nécessaire**

---

## 8. Structure des fichiers

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Layout racine
│   │   ├── page.tsx                      # Page desktop (QR code)
│   │   ├── globals.css                   # Styles globaux Tailwind
│   │   └── mobile/
│   │       └── [sessionId]/
│   │           ├── page.tsx              # Upload & Analyse
│   │           └── results/
│   │               └── page.tsx          # Résultats
│   ├── components/
│   │   ├── desktop/
│   │   │   ├── QRCodeDisplay.tsx
│   │   │   └── SessionInfo.tsx
│   │   ├── mobile/
│   │   │   ├── ImageUploader.tsx
│   │   │   ├── AnalyzeButton.tsx
│   │   │   ├── GradeResultCard.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   └── shared/
│   │       ├── ErrorMessage.tsx
│   │       └── ErrorBoundary.tsx
│   ├── lib/
│   │   ├── api.ts                        # Fonctions API (fetch)
│   │   ├── types.ts                      # Types TypeScript
│   │   └── utils.ts                      # Utilitaires
│   └── hooks/
│       ├── useSession.ts                 # Hook pour gérer une session
│       └── useImageUpload.ts             # Hook pour upload d'images
├── public/
│   └── images/                           # Images statiques
├── next.config.ts                        # Config Next.js
├── tailwind.config.ts                    # Config Tailwind
├── package.json
└── tsconfig.json
```

---

## 9. Types TypeScript partagés

**Créer un fichier `src/lib/types.ts`:**

```typescript
// Types alignés avec l'API NestJS

export type SessionStatus = 'PENDING' | 'IMAGES_UPLOADED' | 'ANALYZING' | 'COMPLETED' | 'ERROR';
export type ImageSide = 'FRONT' | 'BACK';
export type GradingScale = 'PCA' | 'PSA';

export interface Session {
  id: string;
  userId: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SessionImage {
  id: string;
  sessionId: string;
  side: ImageSide;
  path: string;
  createdAt: string;
}

export interface GradeResult {
  id: string;
  sessionId: string;
  scale: GradingScale;
  finalGrade: number;
  scores: {
    centering: number;
    corners: number;
    edges: number;
    surface: number;
    printQuality: number;
  };
  confidence: number;
  createdAt: string;
}
```

---

## 10. Dépendances à installer

### Nouvelles dépendances

```bash
cd apps/web

# QR Code
npm install qrcode.react
npm install -D @types/qrcode.react

# Client HTTP (optionnel, fetch natif suffit)
# npm install axios
```

### Package.json final

```json
{
  "name": "@pokemon/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "next": "16.1.1",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "qrcode.react": "^4.1.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/qrcode.react": "^1.0.5",
    "eslint": "^9",
    "eslint-config-next": "16.1.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## 11. Configuration Next.js

### next.config.ts

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autoriser les images depuis l'API
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
    ],
  },
  // Optionnel: proxy API pour éviter CORS
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/:path*',
      },
    ];
  },
};

export default nextConfig;
```

---

## 12. Design & UI (Tailwind)

### Palette de couleurs

```css
/* globals.css */
:root {
  --color-primary: #3b82f6;      /* blue-500 */
  --color-success: #10b981;      /* green-500 */
  --color-error: #ef4444;        /* red-500 */
  --color-warning: #f59e0b;      /* amber-500 */
  --color-bg: #ffffff;
  --color-text: #1f2937;         /* gray-800 */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #1f2937;         /* gray-800 */
    --color-text: #f9fafb;       /* gray-50 */
  }
}
```

### Composants UI de base

- **Boutons**: Primary, Secondary, Danger
- **Cards**: Pour les résultats de grading
- **Input file**: Custom styling pour upload
- **Loading**: Spinner animé
- **Error**: Alert box rouge

---

## 13. Gestion des erreurs

### Error Boundary

```typescript
// src/components/shared/ErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 text-red-800 rounded">
          <h2>Une erreur est survenue</h2>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Gestion des erreurs API

```typescript
// src/lib/api.ts
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText || response.statusText);
  }

  return response.json();
}
```

---

## 14. Hooks personnalisés

### useSession

```typescript
// src/hooks/useSession.ts
'use client';

import { useState, useEffect } from 'react';
import { Session } from '@/lib/types';
import { fetchApi } from '@/lib/api';

export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    const fetchSession = async () => {
      try {
        setIsLoading(true);
        const data = await fetchApi<Session>(`http://localhost:3000/sessions/${sessionId}`);
        setSession(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  return { session, isLoading, error };
}
```

### useImageUpload

```typescript
// src/hooks/useImageUpload.ts
'use client';

import { useState } from 'react';
import { SessionImage, ImageSide } from '@/lib/types';

export function useImageUpload(sessionId: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = async (file: File, side: ImageSide): Promise<SessionImage | null> => {
    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('side', side);

      const response = await fetch(`http://localhost:3000/sessions/${sessionId}/images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload');
      }

      const uploadedImage = await response.json();
      return uploadedImage;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadImage, isUploading, error };
}
```

---

## 15. Plan d'implémentation (ordre)

### Phase 1: Configuration & Structure
1. ✅ Installer les dépendances (`qrcode.react`)
2. ✅ Créer la structure des dossiers (`components/`, `lib/`, `hooks/`)
3. ✅ Créer `src/lib/types.ts` avec les types TypeScript
4. ✅ Créer `src/lib/api.ts` avec les fonctions API
5. ✅ Configurer `next.config.ts` (images, rewrites)

### Phase 2: Composants partagés
6. ✅ Créer `ErrorBoundary.tsx`
7. ✅ Créer `ErrorMessage.tsx`
8. ✅ Créer `LoadingSpinner.tsx`

### Phase 3: Page Desktop
9. ✅ Créer `src/app/page.tsx` (page desktop)
10. ✅ Créer `QRCodeDisplay.tsx`
11. ✅ Créer `SessionInfo.tsx`
12. ✅ Implémenter la création de session au chargement

### Phase 4: Hooks
13. ✅ Créer `useSession.ts`
14. ✅ Créer `useImageUpload.ts`

### Phase 5: Page Mobile - Upload
15. ✅ Créer `src/app/mobile/[sessionId]/page.tsx`
16. ✅ Créer `ImageUploader.tsx`
17. ✅ Créer `AnalyzeButton.tsx`
18. ✅ Implémenter upload FRONT/BACK
19. ✅ Implémenter bouton "Analyser"

### Phase 6: Page Mobile - Résultats
20. ✅ Créer `src/app/mobile/[sessionId]/results/page.tsx`
21. ✅ Créer `GradeResultCard.tsx`
22. ✅ Implémenter affichage des résultats

### Phase 7: Styling & Polish
23. ✅ Améliorer le design Tailwind
24. ✅ Ajouter transitions et animations
25. ✅ Responsive mobile/desktop
26. ✅ Gestion des états vides/erreurs

### Phase 8: Tests & Documentation
27. ✅ Tester le flow complet desktop → mobile
28. ✅ Tester la gestion des erreurs
29. ✅ Mettre à jour le README.md
30. ✅ Documenter l'API client (JSDoc)

---

## 16. Points d'attention

### Sécurité
- ⚠️ **CORS**: L'API NestJS doit accepter les requêtes depuis `http://localhost:3001` (Next.js dev)
- ⚠️ **Upload**: Vérifier la taille max des fichiers (côté API)
- ⚠️ **Validation**: Valider que les images sont bien FRONT/BACK avant l'analyse

### Performance
- ✅ Utiliser `next/image` pour les images uploadées
- ✅ Lazy loading des composants lourds
- ✅ Caching des résultats côté client (React Query post-MVP)

### UX
- ✅ Loading states clairs
- ✅ Messages d'erreur explicites
- ✅ Feedback visuel lors de l'upload
- ✅ Instructions claires pour l'utilisateur

### Accessibilité
- ✅ Labels sur les inputs
- ✅ Alt text sur les images
- ✅ Contraste des couleurs (WCAG AA)

---

## 17. Variables d'environnement

### Créer `.env.local`

```bash
# URL de l'API NestJS
NEXT_PUBLIC_API_URL=http://localhost:3000

# URL publique de l'application (pour QR code)
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

**Note:** Les variables préfixées par `NEXT_PUBLIC_` sont accessibles côté client.

---

## 18. README.md (apps/web)

```markdown
# Card Grading Web Interface

> Interface web Next.js pour le système de certification de cartes à collectionner.

## Démarrage rapide

```bash
# Installer les dépendances
npm install

# Démarrer en mode développement
npm run dev
```

L'application sera disponible sur http://localhost:3001

## Prérequis

- Node.js >= 18
- API NestJS en cours d'exécution sur http://localhost:3000

## Workflow

1. **Desktop**: Ouvrir http://localhost:3001 → QR code s'affiche
2. **Mobile**: Scanner le QR code → Upload photos FRONT/BACK → Analyser
3. **Mobile**: Consulter les résultats de grading

## Stack

- Next.js 16.1 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- qrcode.react

## Structure

```
src/
├── app/              # Routes (App Router)
├── components/       # Composants React
├── hooks/            # Hooks personnalisés
└── lib/              # Utilitaires et types
```
```

---

## 19. Évolutions post-MVP

### Fonctionnalités
- [ ] Synchronisation temps réel (WebSocket)
- [ ] Historique des sessions
- [ ] Authentification utilisateur
- [ ] Partage de résultats (lien public)
- [ ] Export PDF des résultats
- [ ] Comparaison de cartes

### Techniques
- [ ] React Query pour le caching
- [ ] Optimistic updates
- [ ] PWA (Progressive Web App)
- [ ] Tests E2E (Playwright)
- [ ] Storybook pour les composants

---

## 20. Checklist de déploiement

### Avant déploiement
- [ ] Variables d'environnement configurées
- [ ] Build réussit (`npm run build`)
- [ ] Tests passent
- [ ] CORS configuré sur l'API
- [ ] URL de production dans QR code

### Déploiement
- [ ] Déployer sur Vercel/Netlify
- [ ] Configurer domaine personnalisé
- [ ] SSL/HTTPS activé
- [ ] Analytics configurés (optionnel)

---

## Conclusion

Ce plan couvre l'implémentation complète de l'interface web Next.js pour le MVP du système Card Grading. L'approche est simple, progressive et évolutive.

**Points clés:**
- Pas d'authentification (sessions anonymes)
- QR code pour lier desktop ↔ mobile
- Upload simple via input file
- Pas de synchronisation temps réel (standalone mobile)
- Design simple et fonctionnel avec Tailwind

**Prochaines étapes:**
1. Implémenter la Phase 1 (configuration)
2. Tester avec l'API NestJS locale
3. Itérer sur le design
4. Préparer le déploiement

