# Plan de Documentation Technique - Card Grading

**Date**: 2026-01-10
**Auteur**: Documentation Engineer Agent
**Version**: 1.0

---

## 1. Audit de la Documentation Existante

### 1.1 Documentation Actuelle

| Fichier | Localisation | Contenu | Qualite | Statut |
|---------|--------------|---------|---------|--------|
| `QUICK_START.md` | Racine | Setup PostgreSQL/Prisma rapide | Bon | A enrichir |
| `DATABASE_SETUP.md` | Racine | Configuration DB detaillee | Excellent | OK |
| `SETUP_SUMMARY.md` | Racine | Resume configuration | Bon | OK |
| `FILES_CREATED.md` | Racine | Liste fichiers crees | OK | A supprimer/fusionner |
| `AGENTS.md` | Racine | Vide | - | A supprimer ou completer |
| `apps/api/README.md` | API | Template NestJS generique | Mauvais | A remplacer |
| `apps/web/README.md` | Web | Template Next.js generique | Mauvais | A remplacer |
| `apps/mobile/README.md` | Mobile | Documentation complete POC | Excellent | OK |
| `apps/mobile/docs/*` | Mobile | Guides detailles | Excellent | OK |
| `.claude/CLAUDE.md` | Claude | Instructions agents | OK | Interne |
| `.claude/docs/tasks/*.md` | Claude | Plans techniques | OK | Interne |

### 1.2 Ce qui manque cruellement

1. **README principal** a la racine - Vue d'ensemble du projet
2. **Documentation API** - Enrichissement Swagger + guide des endpoints
3. **Documentation Architecture** - Diagrammes, flow de donnees
4. **Documentation ML** - Guide du service Python, entrainement modele
5. **Guide de contribution** - Standards, workflow Git
6. **Documentation de deploiement** - Production, Docker, CI/CD
7. **Documentation des variables d'environnement** - Centralise

### 1.3 Points positifs

- Swagger deja configure sur `/api/docs`
- Decorateurs API documentes dans les controllers NestJS
- Documentation mobile tres complete
- Setup DB bien documente

---

## 2. Structure de Documentation Recommandee

### 2.1 Arborescence Proposee

```
pokemon/
├── README.md                           # [NOUVEAU] Vue d'ensemble projet
├── docs/
│   ├── README.md                       # [NOUVEAU] Index documentation
│   ├── architecture/
│   │   ├── overview.md                 # [NOUVEAU] Architecture globale
│   │   ├── diagrams/
│   │   │   ├── system-architecture.png # [NOUVEAU] Diagramme systeme
│   │   │   ├── grading-flow.png        # [NOUVEAU] Flow de notation
│   │   │   └── data-model.png          # [NOUVEAU] Schema DB
│   │   └── decisions/
│   │       └── ADR-001-monorepo.md     # [NOUVEAU] Architecture Decision Records
│   ├── api/
│   │   ├── README.md                   # [NOUVEAU] Guide API
│   │   ├── endpoints.md                # [NOUVEAU] Reference endpoints
│   │   ├── authentication.md           # [NOUVEAU] Guide auth (futur)
│   │   └── examples/
│   │       └── grading-session.md      # [NOUVEAU] Exemple complet
│   ├── ml/
│   │   ├── README.md                   # [NOUVEAU] Vue d'ensemble ML
│   │   ├── model-training.md           # [NOUVEAU] Guide entrainement
│   │   ├── data-format.md              # [NOUVEAU] Format donnees
│   │   └── deployment.md               # [NOUVEAU] Deploiement modele
│   ├── getting-started/
│   │   ├── installation.md             # [NOUVEAU] Installation complete
│   │   ├── development.md              # [NOUVEAU] Guide developpeur
│   │   ├── docker.md                   # [NOUVEAU] Setup Docker
│   │   └── troubleshooting.md          # [NOUVEAU] Depannage
│   └── contributing/
│       ├── CONTRIBUTING.md             # [NOUVEAU] Guide contribution
│       ├── code-style.md               # [NOUVEAU] Standards code
│       ├── git-workflow.md             # [NOUVEAU] Workflow Git
│       └── testing.md                  # [NOUVEAU] Guide tests
├── apps/
│   ├── api/
│   │   └── README.md                   # [MODIFIER] Specifique au projet
│   ├── mobile/
│   │   └── README.md                   # [OK] Deja complet
│   └── web/
│       └── README.md                   # [MODIFIER] Specifique au projet
└── packages/
    └── ml/
        └── README.md                   # [NOUVEAU] Documentation service ML
```

### 2.2 Reorganisation Fichiers Existants

| Fichier actuel | Action | Destination |
|----------------|--------|-------------|
| `QUICK_START.md` | Deplacer + enrichir | `docs/getting-started/installation.md` |
| `DATABASE_SETUP.md` | Deplacer | `docs/getting-started/database.md` |
| `SETUP_SUMMARY.md` | Supprimer | Fusionner dans README |
| `FILES_CREATED.md` | Supprimer | Info obsolete |
| `AGENTS.md` | Supprimer | Vide |

---

## 3. Priorites d'Implementation

### 3.1 MVP (Phase 1 - Essentiel)

**Priorite HAUTE - A faire en premier**

| # | Document | Description |
|---|----------|-------------|
| 1 | `README.md` racine | Vue d'ensemble, quick start, liens |
| 2 | `docs/architecture/overview.md` | Architecture, stack, composants |
| 3 | `apps/api/README.md` | Documentation API specifique projet |
| 4 | `packages/ml/README.md` | Documentation service ML Python |
| 5 | `docs/getting-started/installation.md` | Guide complet installation |

### 3.2 Phase 2 - Developpeurs

**Priorite MOYENNE**

| # | Document | Description |
|---|----------|-------------|
| 6 | `docs/api/endpoints.md` | Reference complete API |
| 7 | `docs/api/examples/grading-session.md` | Tutoriel complet |
| 8 | `docs/ml/model-training.md` | Guide entrainement |
| 9 | `docs/ml/data-format.md` | Specification donnees |
| 10 | `docs/getting-started/docker.md` | Setup Docker complet |
| 11 | `docs/contributing/CONTRIBUTING.md` | Guide contribution |

### 3.3 Phase 3 - Production

**Priorite BASSE (futur)**

| # | Document | Description |
|---|----------|-------------|
| 12 | Diagrammes (Mermaid/Draw.io) | Schemas visuels |
| 13 | `docs/architecture/decisions/*` | ADRs |
| 14 | `docs/api/authentication.md` | Guide authentification |
| 15 | `docs/ml/deployment.md` | Deploiement production |
| 16 | `docs/contributing/testing.md` | Guide tests |

---

## 4. Outils Suggeres

### 4.1 Pour ce Projet (Recommande)

**Documentation simple Markdown** - Adapte au stade actuel

Avantages:
- Pas de config supplementaire
- Versionne avec le code
- Supporte par GitHub/GitLab
- Leger et rapide

### 4.2 Options Futures (Quand le projet grandira)

| Outil | Cas d'usage | Quand l'adopter |
|-------|-------------|-----------------|
| **Docusaurus** | Site doc complet | Quand plusieurs devs externes |
| **MkDocs** | Doc technique structuree | Alternative Docusaurus |
| **Swagger/OpenAPI** | API Reference | Deja en place - enrichir |
| **Storybook** | Components UI | Quand app web mature |
| **Mermaid** | Diagrammes as code | Phase 3+ |
| **Draw.io** | Diagrammes complexes | Architecture detaillee |

### 4.3 Configuration Swagger Recommandee

Enrichir la configuration Swagger existante dans `apps/api/src/main.ts`:

```typescript
const config = new DocumentBuilder()
  .setTitle('Card Grading API')
  .setDescription(`
    API de certification automatique de cartes a collectionner.

    ## Fonctionnalites
    - Sessions de grading (CRUD)
    - Upload d'images (recto/verso)
    - Analyse ML automatique
    - Resultats PCA/PSA

    ## Workflow typique
    1. Creer une session
    2. Uploader images
    3. Lancer l'analyse
    4. Recuperer les resultats
  `)
  .setVersion('1.0')
  .addTag('Sessions', 'Gestion des sessions de grading')
  .addTag('ML', 'Service Machine Learning')
  .addTag('Health', 'Endpoints de sante')
  .addBearerAuth() // Preparer pour auth future
  .setContact('Card Grading Team', '', 'team@cardgrading.com')
  .setLicense('MIT', '')
  .build();
```

---

## 5. Templates de Documentation

### 5.1 Template README Principal

```markdown
# Card Grading - Certification Automatique de Cartes

> Application de notation automatique de cartes a collectionner utilisant
> l'intelligence artificielle pour fournir des grades PCA/PSA.

## Fonctionnalites

- Capture photo (recto/verso)
- Analyse IA locale
- Notation multi-criteres (centrage, coins, bords, surface, qualite impression)
- Grades compatibles PCA/PSA

## Stack Technique

| Composant | Technologie | Port |
|-----------|-------------|------|
| API Backend | NestJS + Prisma | 3000 |
| Service ML | FastAPI + TensorFlow | 5000 |
| App Mobile | React Native + Expo | 8081 |
| Interface Web | Next.js | 3001 |
| Base de donnees | PostgreSQL | 5432 |

## Quick Start

### Prerequis
- Node.js >= 18
- Python >= 3.10
- Docker & Docker Compose

### Installation

\`\`\`bash
# Cloner le repo
git clone <repo-url>
cd pokemon

# Installer les dependances
npm install

# Demarrer PostgreSQL
docker-compose up -d

# Configurer la DB
cd apps/api
cp .env.example .env
npm run prisma:migrate

# Demarrer l'API
npm run start:dev
\`\`\`

## Documentation

- [Guide d'installation](docs/getting-started/installation.md)
- [Architecture](docs/architecture/overview.md)
- [API Reference](http://localhost:3000/api/docs)
- [Guide ML](packages/ml/README.md)

## Contribution

Voir [CONTRIBUTING.md](docs/contributing/CONTRIBUTING.md)

## License

MIT
```

### 5.2 Template README Service/App

```markdown
# [Nom du Service]

> Description courte du service

## Responsabilites

- Point 1
- Point 2

## Installation

\`\`\`bash
# Commandes d'installation
\`\`\`

## Configuration

| Variable | Description | Defaut |
|----------|-------------|--------|
| VAR_1 | Description | valeur |

## Usage

\`\`\`bash
# Commandes de lancement
\`\`\`

## API/Endpoints

Description des endpoints ou du module expose

## Tests

\`\`\`bash
npm run test
\`\`\`

## Structure

\`\`\`
src/
├── module/
│   ├── module.controller.ts
│   ├── module.service.ts
│   └── dto/
\`\`\`
```

### 5.3 Template Documentation Architecture

```markdown
# Architecture - [Nom du Composant]

## Vue d'ensemble

[Description + Diagramme]

## Composants

### Composant A
- Role
- Technologies
- Interfaces

### Composant B
...

## Flux de donnees

1. Etape 1
2. Etape 2
3. ...

## Decisions techniques

- Decision 1: Raison
- Decision 2: Raison

## Limites connues

- Limite 1
- Limite 2
```

### 5.4 Template Guide Endpoint API

```markdown
# [Nom de l'endpoint]

## Description

[Ce que fait l'endpoint]

## Endpoint

\`\`\`
METHOD /path
\`\`\`

## Parametres

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| param1 | string | Oui | Description |

## Headers

| Header | Description |
|--------|-------------|
| Authorization | Bearer token |

## Request Body

\`\`\`json
{
  "field": "value"
}
\`\`\`

## Response

### Success (200)

\`\`\`json
{
  "id": "uuid",
  "status": "ok"
}
\`\`\`

### Errors

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 404 | Not Found |

## Exemple cURL

\`\`\`bash
curl -X POST http://localhost:3000/endpoint \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'
\`\`\`
```

---

## 6. Checklist d'Implementation

### Phase 1 - MVP

- [ ] **README.md racine**
  - [ ] Description projet
  - [ ] Stack technique
  - [ ] Quick start
  - [ ] Liens vers docs

- [ ] **docs/architecture/overview.md**
  - [ ] Diagramme composants (ASCII/Mermaid)
  - [ ] Description chaque service
  - [ ] Flux de grading
  - [ ] Schema base de donnees

- [ ] **apps/api/README.md**
  - [ ] Description API
  - [ ] Installation
  - [ ] Configuration
  - [ ] Endpoints principaux
  - [ ] Lien Swagger

- [ ] **packages/ml/README.md**
  - [ ] Description service
  - [ ] Installation Python
  - [ ] Configuration
  - [ ] Endpoints
  - [ ] Modele utilise

- [ ] **docs/getting-started/installation.md**
  - [ ] Prerequis
  - [ ] Installation monorepo
  - [ ] Configuration DB
  - [ ] Lancement services
  - [ ] Verification

### Phase 2 - Developpeurs

- [ ] **docs/api/endpoints.md**
  - [ ] Sessions (CRUD)
  - [ ] Images (upload/delete)
  - [ ] Analyse
  - [ ] Resultats

- [ ] **docs/api/examples/grading-session.md**
  - [ ] Scenario complet
  - [ ] Requetes cURL
  - [ ] Reponses attendues

- [ ] **docs/ml/model-training.md**
  - [ ] Dataset format
  - [ ] Preprocessing
  - [ ] Entrainement
  - [ ] Evaluation

- [ ] **docs/ml/data-format.md**
  - [ ] Format images
  - [ ] Labels
  - [ ] Annotations

- [ ] **docs/getting-started/docker.md**
  - [ ] Docker Compose
  - [ ] Services
  - [ ] Volumes
  - [ ] Networking

- [ ] **docs/contributing/CONTRIBUTING.md**
  - [ ] Code of conduct
  - [ ] How to contribute
  - [ ] PR process
  - [ ] Review guidelines

### Phase 3 - Production

- [ ] **Diagrammes visuels**
  - [ ] Architecture systeme
  - [ ] Flow de grading
  - [ ] Modele de donnees

- [ ] **docs/architecture/decisions/**
  - [ ] ADR template
  - [ ] ADR-001 Monorepo
  - [ ] ADR-002 Stack choices

- [ ] **docs/api/authentication.md**
  - [ ] Strategie auth
  - [ ] JWT implementation
  - [ ] Guards NestJS

- [ ] **docs/ml/deployment.md**
  - [ ] Packaging modele
  - [ ] CI/CD
  - [ ] Monitoring

- [ ] **docs/contributing/testing.md**
  - [ ] Unit tests
  - [ ] Integration tests
  - [ ] E2E tests
  - [ ] Coverage

---

## 7. Enrichissement Swagger Existant

### 7.1 Actions Recommandees

Le Swagger actuel est fonctionnel mais peut etre enrichi:

1. **Ajouter des exemples de reponses** dans les DTOs
2. **Enrichir les descriptions** des endpoints
3. **Ajouter des schemas** pour les erreurs
4. **Documenter les enums** (SessionStatus, CardSide, GradeScale)
5. **Ajouter authentification** (preparer pour JWT)

### 7.2 Exemple d'enrichissement DTO

```typescript
// Avant
export class CreateSessionDto {
  @IsNumber()
  userId: number;
}

// Apres
export class CreateSessionDto {
  @ApiProperty({
    description: 'ID de l\'utilisateur proprietaire de la session',
    example: 1,
  })
  @IsNumber()
  userId: number;

  @ApiPropertyOptional({
    description: 'Nom de la carte (optionnel)',
    example: 'Charizard Holo 1st Edition',
  })
  @IsString()
  @IsOptional()
  cardName?: string;
}
```

---

## 8. Maintenance de la Documentation

### 8.1 Bonnes Pratiques

1. **Doc-as-Code**: Documentation versionnee avec le code
2. **Review**: Inclure la doc dans les PR reviews
3. **Automated checks**: Linter Markdown, liens casses
4. **Keep it simple**: Markdown > outils complexes
5. **Examples first**: Privilegier les exemples concrets

### 8.2 Responsabilites

| Type de doc | Responsable |
|-------------|-------------|
| README projet | Lead dev |
| API endpoints | Backend devs |
| ML/Model | ML engineers |
| Architecture | Tech lead |
| Contributing | Tous |

---

## 9. Conclusion

### Priorites Immediates

1. **Creer le README principal** - Premier point d'entree
2. **Documenter l'architecture** - Comprendre le systeme
3. **README API et ML** - Permettre le developpement

### ROI de la Documentation

- Reduction du temps d'onboarding
- Moins de questions repetitives
- Meilleure qualite de code
- Facilite les contributions externes
- Reference pour decisions futures

### Resume des Phases

| Phase | Documents |
|-------|-----------|
| Phase 1 (MVP) | 5 |
| Phase 2 (Dev) | 6 |
| Phase 3 (Prod) | 5 |
| **Total** | **16** |

---

*Ce plan est un guide - adapter selon les besoins et contraintes du projet.*
