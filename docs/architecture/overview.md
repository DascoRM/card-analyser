# Architecture - Card Grading

## Vue d'ensemble

Le projet Card Grading est une application de certification automatique de cartes a collectionner. Elle utilise le machine learning pour analyser des images de cartes et fournir des grades compatibles avec les standards PCA/PSA.

### Diagramme des Composants

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│    ┌──────────────┐              ┌──────────────┐               │
│    │  App Mobile  │              │   App Web    │               │
│    │ React Native │              │   Next.js    │               │
│    │   :8081      │              │    :3001     │               │
│    └──────┬───────┘              └──────┬───────┘               │
│           │                             │                        │
│           └─────────────┬───────────────┘                        │
│                         │ HTTP/REST                              │
│                         ▼                                        │
├─────────────────────────────────────────────────────────────────┤
│                       BACKEND                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│    ┌────────────────────────────────────────────┐               │
│    │              API NestJS                     │               │
│    │                :3000                        │               │
│    │  ┌──────────────────────────────────────┐  │               │
│    │  │  Modules:                            │  │               │
│    │  │  - Sessions (CRUD, upload, analyze)  │  │               │
│    │  │  - ML (communication service ML)     │  │               │
│    │  │  - Users (gestion utilisateurs)      │  │               │
│    │  └──────────────────────────────────────┘  │               │
│    └────────────────┬───────────────────────────┘               │
│                     │                                            │
│          ┌──────────┴──────────┐                                │
│          │                     │                                 │
│          ▼                     ▼                                 │
│    ┌───────────┐        ┌──────────────┐                        │
│    │ PostgreSQL│        │  Service ML  │                        │
│    │   :5432   │        │ FastAPI/TF   │                        │
│    └───────────┘        │    :5000     │                        │
│                         └──────────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Composants

### 1. API Backend (NestJS)

**Localisation**: `apps/api/`

**Responsabilites**:
- Gestion des sessions de grading (CRUD)
- Upload et stockage des images
- Communication avec le service ML
- Calcul et stockage des resultats
- Exposition de l'API REST

**Technologies**:
- NestJS (framework Node.js)
- Prisma (ORM)
- PostgreSQL (base de donnees)
- Multer (upload fichiers)
- Swagger (documentation API)

**Modules Principaux**:

| Module | Description |
|--------|-------------|
| `SessionsModule` | Gestion complete des sessions de grading |
| `MlModule` | Communication HTTP avec le service ML |
| `PrismaModule` | Connexion base de donnees |

### 2. Service ML (FastAPI + TensorFlow)

**Localisation**: `packages/ml/`

**Responsabilites**:
- Preprocessing des images (resize, normalisation)
- Inference via modele TensorFlow
- Retourne les scores pour chaque critere

**Technologies**:
- Python 3.10+
- FastAPI
- TensorFlow / TensorFlow.js
- OpenCV / Pillow

**Endpoints**:

| Endpoint | Description |
|----------|-------------|
| `POST /analyze` | Analyse une paire d'images |
| `GET /health` | Verification de sante |
| `GET /model/info` | Informations sur le modele |

### 3. Application Mobile (React Native)

**Localisation**: `apps/mobile/`

**Responsabilites**:
- Capture photo haute qualite
- Interface utilisateur mobile
- Envoi des images a l'API

**Technologies**:
- React Native + Expo
- expo-camera
- React Navigation

### 4. Interface Web (Next.js)

**Localisation**: `apps/web/`

**Responsabilites**:
- Dashboard utilisateur
- Historique des sessions
- Visualisation des resultats

**Technologies**:
- Next.js 14+
- React
- Tailwind CSS

## Flux de Grading

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  START  │───▶│ CREATE  │───▶│ UPLOAD  │───▶│ ANALYZE │───▶│ RESULT  │
│         │    │ SESSION │    │ IMAGES  │    │   ML    │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
                   │               │              │              │
                   ▼               ▼              ▼              ▼
              PENDING        UPLOADING      ANALYZING      COMPLETED
```

### Etapes Detaillees

1. **Creation de Session**
   - Client envoie `POST /sessions` avec `userId`
   - Session creee avec status `PENDING`

2. **Upload des Images**
   - `POST /sessions/:id/images` avec image FRONT
   - `POST /sessions/:id/images` avec image BACK
   - Status passe a `UPLOADING`

3. **Lancement de l'Analyse**
   - `POST /sessions/:id/analyze` avec echelle (PCA/PSA)
   - API envoie les images au service ML
   - Status passe a `ANALYZING`

4. **Traitement ML**
   - Service ML pretraite les images
   - Modele analyse et retourne les scores
   - Scores: centering, corners, edges, surface, printQuality

5. **Resultat Final**
   - API calcule la note finale (minimum des scores)
   - Resultat stocke dans `GradeResult`
   - Status passe a `COMPLETED`

## Schema de Base de Donnees

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│     User     │       │     Session      │       │   SessionImage   │
├──────────────┤       ├──────────────────┤       ├──────────────────┤
│ id           │──┐    │ id               │──┐    │ id               │
│ email        │  │    │ userId          ◄┘  │    │ sessionId       ◄┘
│ name         │  │    │ cardName         │  │    │ side (FRONT/BACK)│
│ createdAt    │  └───▶│ cardSet          │  │    │ url              │
│ updatedAt    │       │ cardYear         │  │    │ filename         │
└──────────────┘       │ cardType         │  │    │ mimeType         │
                       │ status           │  │    │ size             │
                       │ createdAt        │  │    │ uploadedAt       │
                       │ completedAt      │  │    └──────────────────┘
                       └──────────────────┘  │
                                             │    ┌──────────────────┐
                                             │    │   GradeResult    │
                                             │    ├──────────────────┤
                                             └───▶│ id               │
                                                  │ sessionId        │
                                                  │ scale (PCA/PSA)  │
                                                  │ centering        │
                                                  │ corners          │
                                                  │ edges            │
                                                  │ surface          │
                                                  │ printQuality     │
                                                  │ finalGrade       │
                                                  │ gradeLabel       │
                                                  │ confidence       │
                                                  │ modelVersion     │
                                                  └──────────────────┘
```

### Enums

| Enum | Valeurs |
|------|---------|
| `SessionStatus` | PENDING, UPLOADING, ANALYZING, COMPLETED, FAILED, ARCHIVED |
| `CardSide` | FRONT, BACK |
| `GradeScale` | PCA, PSA |

## Communication Inter-Services

### API ↔ Service ML

```
┌──────────┐                    ┌──────────┐
│   API    │  POST /analyze     │    ML    │
│  NestJS  │───────────────────▶│  FastAPI │
│          │                    │          │
│          │   JSON Response    │          │
│          │◀───────────────────│          │
└──────────┘                    └──────────┘
```

**Authentification**: API Key via header `X-API-Key`

**Payload Requete**:
```json
{
  "session_id": "uuid",
  "front_image_path": "/uploads/sessions/front.jpg",
  "back_image_path": "/uploads/sessions/back.jpg"
}
```

**Payload Reponse**:
```json
{
  "centering": 9.5,
  "corners": 8.0,
  "edges": 8.5,
  "surface": 9.0,
  "print_quality": 9.0,
  "confidence": 0.92,
  "model_version": "mvp-v1"
}
```

## Decisions Techniques

| Decision | Raison |
|----------|--------|
| **Monorepo** | Facilite le partage de types et la CI/CD |
| **NestJS** | Framework structure, injection de dependances, Swagger integre |
| **FastAPI** | Performant pour ML, async native, documentation auto |
| **PostgreSQL** | Robuste, supporte JSON, excellente avec Prisma |
| **Filesystem pour images** | Simple, performant, adapte au MVP |
| **API Key inter-services** | Securite simple pour communication interne |

## Limites Actuelles (MVP)

- Pas d'authentification utilisateur (JWT a venir)
- Modele ML en mode mock (entrainement a venir)
- Pas de cache (Redis a venir)
- Pas de file d'attente (Bull/Redis a venir)
- Single instance (pas de scaling horizontal)

## Evolutions Prevues

1. **Phase 2**: Authentification JWT, modele ML entraine
2. **Phase 3**: Cache Redis, file d'attente, monitoring
3. **Phase 4**: Scaling horizontal, CDN pour images
