# Card Grading - Interface Web

> Interface web Next.js pour le systeme de certification automatique de cartes a collectionner.

## Fonctionnalites

- **Page Desktop**: Affiche un QR code pour demarrer une session
- **Page Mobile**: Upload des photos (recto/verso) via camera
- **Resultats**: Affichage des grades avec details par critere

## Workflow

```
[Desktop] Ouvrir l'app → QR code genere
     ↓
[Mobile] Scanner QR → Upload photos → Analyser
     ↓
[Mobile] Affichage des resultats
```

## Demarrage

### Prerequis

- Node.js >= 18
- API NestJS en cours d'execution sur `http://localhost:3000`

### Installation

```bash
# Depuis apps/web
npm install
```

### Developpement

```bash
npm run dev
```

L'application sera disponible sur **http://localhost:3001**

### Production

```bash
npm run build
npm run start
```

## Configuration

### Variables d'environnement (.env.local)

| Variable | Description | Defaut |
|----------|-------------|--------|
| `NEXT_PUBLIC_API_URL` | URL de l'API NestJS | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | URL de l'app (pour QR code) | `http://localhost:3001` |

## Structure

```
src/
├── app/
│   ├── page.tsx                    # Page desktop (QR code)
│   └── mobile/
│       └── [sessionId]/
│           ├── page.tsx            # Upload photos
│           └── results/
│               └── page.tsx        # Resultats
├── components/
│   ├── desktop/                    # Composants desktop
│   │   ├── QRCodeDisplay.tsx
│   │   └── SessionInfo.tsx
│   ├── mobile/                     # Composants mobile
│   │   ├── ImageUploader.tsx
│   │   ├── AnalyzeButton.tsx
│   │   └── GradeResultCard.tsx
│   └── shared/                     # Composants partages
│       ├── LoadingSpinner.tsx
│       └── ErrorMessage.tsx
├── hooks/
│   ├── useCreateSession.ts
│   ├── useSession.ts
│   └── useImageUpload.ts
└── lib/
    ├── api.ts                      # Fonctions API
    └── types.ts                    # Types TypeScript
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Page desktop avec QR code |
| `/mobile/[sessionId]` | Page mobile upload |
| `/mobile/[sessionId]/results` | Page resultats |

## Stack

- Next.js 16.1 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- qrcode.react

## Liens

- [API NestJS](../api/README.md)
- [Documentation Architecture](../../docs/architecture/overview.md)
