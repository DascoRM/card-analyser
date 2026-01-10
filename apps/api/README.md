# Card Grading API

> API REST backend pour le systeme de certification automatique de cartes a collectionner.

## Responsabilites

- Gestion des sessions de grading (CRUD)
- Upload et stockage des images de cartes
- Communication avec le service ML pour l'analyse
- Calcul et stockage des resultats de grading
- Exposition de la documentation Swagger

## Stack Technique

| Technologie | Usage |
|-------------|-------|
| NestJS | Framework backend |
| Prisma | ORM et migrations |
| PostgreSQL | Base de donnees |
| Multer | Upload de fichiers |
| Swagger | Documentation API |
| Axios | Communication HTTP (ML Service) |

## Installation

### Prerequis

- Node.js >= 18
- PostgreSQL (via Docker recommande)
- Service ML en cours d'execution (optionnel, fallback disponible)

### Setup

```bash
# Depuis la racine du monorepo
cd apps/api

# Installer les dependances
npm install

# Copier le fichier d'environnement
cp .env.example .env
# Editer .env avec vos valeurs

# Demarrer PostgreSQL (si pas deja fait)
docker-compose up -d

# Appliquer les migrations
npx prisma migrate dev

# Generer le client Prisma
npx prisma generate
```

## Configuration

### Variables d'environnement (.env)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL de connexion PostgreSQL | `postgresql://user:pass@localhost:5432/db` |
| `ML_SERVICE_URL` | URL du service ML | `http://localhost:5000` |
| `ML_API_KEY` | Cle API pour le service ML | `your-api-key` |
| `ML_TIMEOUT` | Timeout des appels ML (ms) | `30000` |
| `ML_MAX_RETRIES` | Nombre de tentatives | `3` |
| `ML_ENABLE_FALLBACK` | Activer le mode mock si ML indisponible | `true` |

## Demarrage

```bash
# Mode developpement (watch)
npm run start:dev

# Mode production
npm run build && npm run start:prod

# Mode debug
npm run start:debug
```

L'API sera disponible sur `http://localhost:3000`

## Documentation API (Swagger)

Une fois l'API demarree, accedez a la documentation interactive:

**URL**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

## Modules

### SessionsModule

Gestion complete des sessions de grading.

| Endpoint | Methode | Description |
|----------|---------|-------------|
| `/sessions` | POST | Creer une session |
| `/sessions` | GET | Lister les sessions (filtre par userId) |
| `/sessions/:id` | GET | Recuperer une session |
| `/sessions/:id` | PUT | Modifier une session |
| `/sessions/:id` | DELETE | Archiver une session |
| `/sessions/:id/images` | POST | Uploader une image |
| `/sessions/:id/images` | GET | Lister les images |
| `/sessions/:id/images/:imageId` | DELETE | Supprimer une image |
| `/sessions/:id/analyze` | POST | Lancer l'analyse ML |
| `/sessions/:id/results` | GET | Recuperer les resultats |

### MlModule

Communication avec le service ML Python.

| Endpoint | Methode | Description |
|----------|---------|-------------|
| `/ml/health` | GET | Verifier la sante du service ML |
| `/ml/model/info` | GET | Informations sur le modele |

## Structure du Code

```
src/
├── main.ts                  # Point d'entree + config Swagger
├── app.module.ts            # Module racine
├── prisma/
│   └── prisma.service.ts    # Service Prisma
├── sessions/
│   ├── sessions.module.ts   # Configuration module
│   ├── sessions.controller.ts # Endpoints REST
│   ├── sessions.service.ts  # Logique metier
│   ├── dto/                 # Data Transfer Objects
│   │   ├── create-session.dto.ts
│   │   ├── update-session.dto.ts
│   │   └── upload-image.dto.ts
│   ├── enums/               # Enumerations
│   │   └── session.enums.ts
│   └── interfaces/          # Interfaces TypeScript
│       └── grade.interfaces.ts
└── ml/
    ├── ml.module.ts         # Configuration module
    ├── ml.service.ts        # Communication avec ML
    └── interfaces/          # Interfaces ML
        └── ml.interfaces.ts
```

## Base de Donnees

### Modeles Prisma

- **User**: Utilisateurs de l'application
- **Session**: Sessions de grading
- **SessionImage**: Images uploadees (recto/verso)
- **GradeResult**: Resultats de l'analyse ML

### Commandes Prisma

```bash
# Appliquer les migrations
npx prisma migrate dev

# Generer le client
npx prisma generate

# Ouvrir Prisma Studio (GUI)
npx prisma studio

# Reset la base de donnees
npx prisma migrate reset
```

## Tests

```bash
# Tests unitaires
npm run test

# Tests en mode watch
npm run test:watch

# Tests e2e
npm run test:e2e

# Couverture de code
npm run test:cov
```

## Workflow de Grading

1. **Creer une session**: `POST /sessions` avec `userId`
2. **Uploader image FRONT**: `POST /sessions/:id/images` avec `side=FRONT`
3. **Uploader image BACK**: `POST /sessions/:id/images` avec `side=BACK`
4. **Lancer l'analyse**: `POST /sessions/:id/analyze` avec `scale=PCA` ou `scale=PSA`
5. **Recuperer les resultats**: `GET /sessions/:id/results`

## Criteres de Notation

Le service ML analyse 5 criteres (notes de 1 a 10):

| Critere | Description |
|---------|-------------|
| `centering` | Centrage de l'image sur la carte |
| `corners` | Etat des coins |
| `edges` | Etat des bords |
| `surface` | Etat de la surface |
| `printQuality` | Qualite d'impression |

La note finale est le **minimum** des 5 criteres (standard PCA/PSA).

## Gestion des Erreurs

| Code | Description |
|------|-------------|
| 400 | Bad Request - Donnees invalides |
| 401 | Unauthorized - Non authentifie |
| 403 | Forbidden - Acces refuse |
| 404 | Not Found - Ressource introuvable |
| 500 | Internal Server Error |

## Liens

- [Documentation Architecture](../../docs/architecture/overview.md)
- [Service ML](../../packages/ml/README.md)
- [Guide d'installation](../../docs/getting-started/installation.md)
