# Guide de Contribution

Merci de votre interet pour contribuer au projet Card Grading! Ce guide vous aidera a demarrer.

## Code de Conduite

- Soyez respectueux et inclusif
- Acceptez les critiques constructives
- Concentrez-vous sur ce qui est le mieux pour le projet
- Faites preuve d'empathie envers les autres contributeurs

## Comment Contribuer

### 1. Signaler un Bug

Avant de creer une issue:
1. Verifiez que le bug n'a pas deja ete signale
2. Verifiez que vous utilisez la derniere version

Creez une issue avec:
- Description claire du probleme
- Etapes pour reproduire
- Comportement attendu vs observe
- Environnement (OS, versions Node/Python)
- Logs d'erreur si disponibles

### 2. Proposer une Fonctionnalite

1. Ouvrez une issue pour discuter de l'idee
2. Attendez la validation avant de coder
3. Suivez le processus de Pull Request

### 3. Soumettre une Pull Request

#### Workflow Git

```bash
# 1. Fork le repository (sur GitHub)

# 2. Cloner votre fork
git clone https://github.com/VOTRE_USERNAME/card-analyser.git
cd card-analyser

# 3. Ajouter le remote upstream
git remote add upstream https://github.com/ORIGINAL/card-analyser.git

# 4. Creer une branche
git checkout -b feature/ma-fonctionnalite

# 5. Faire vos modifications
# ...

# 6. Committer
git add .
git commit -m "feat(scope): description"

# 7. Pousser
git push origin feature/ma-fonctionnalite

# 8. Creer la Pull Request sur GitHub
```

#### Branches

| Branche | Usage |
|---------|-------|
| `main` | Production stable |
| `develop` | Developpement actif |
| `feature/*` | Nouvelles fonctionnalites |
| `fix/*` | Corrections de bugs |
| `docs/*` | Documentation |

#### Nommage des Branches

```
feature/add-user-authentication
fix/session-upload-error
docs/update-api-reference
refactor/sessions-service
```

## Standards de Code

### TypeScript (NestJS, Next.js)

```typescript
// Utiliser les types explicites
function createSession(dto: CreateSessionDto): Promise<Session> {
  // ...
}

// Eviter any
// ❌ const data: any = {};
// ✅ const data: Record<string, unknown> = {};

// Utiliser les interfaces pour les objets complexes
interface SessionFilters {
  status?: SessionStatus;
  cardType?: string;
}
```

### Python (FastAPI)

```python
# Utiliser les type hints
async def analyze_card(request: AnalyzeRequest) -> AnalyzeResponse:
    ...

# Docstrings pour les fonctions publiques
def calculate_grade(scores: list[float]) -> float:
    """
    Calculate the final grade from individual scores.

    Args:
        scores: List of scores for each criterion

    Returns:
        Final grade (minimum of all scores)
    """
    return min(scores)
```

### Formatage

#### TypeScript/JavaScript

```bash
# Prettier est configure dans le projet
npm run format
```

#### Python

```bash
# Black pour le formatage
black .

# Flake8 pour le linting
flake8 .
```

## Conventions de Commit

Format: `type(scope): description`

### Types

| Type | Description |
|------|-------------|
| `feat` | Nouvelle fonctionnalite |
| `fix` | Correction de bug |
| `docs` | Documentation |
| `style` | Formatage (pas de changement de code) |
| `refactor` | Refactoring |
| `test` | Ajout/modification de tests |
| `chore` | Maintenance (deps, config) |

### Scopes

| Scope | Description |
|-------|-------------|
| `api` | API NestJS |
| `ml` | Service ML |
| `mobile` | App React Native |
| `web` | Interface Next.js |
| `prisma` | Schema/migrations |
| `docker` | Configuration Docker |
| `docs` | Documentation |

### Exemples

```
feat(api): add session analysis endpoint
fix(ml): handle missing image gracefully
docs(api): update endpoints reference
refactor(api): extract grading logic to service
test(api): add sessions controller tests
chore(deps): update nestjs to v10
```

### Corps du Commit

Pour les changements importants, ajoutez un corps:

```
feat(api): add session analysis endpoint

- Add POST /sessions/:id/analyze endpoint
- Integrate with ML service
- Add retry logic with exponential backoff

Closes #123
```

## Tests

### Execution des Tests

```bash
# API - Tests unitaires
cd apps/api
npm run test

# API - Tests e2e
npm run test:e2e

# API - Couverture
npm run test:cov

# ML - Tests
cd packages/ml
pytest tests/
```

### Ecrire des Tests

```typescript
// sessions.service.spec.ts
describe('SessionsService', () => {
  let service: SessionsService;

  beforeEach(async () => {
    // Setup...
  });

  describe('create', () => {
    it('should create a session with PENDING status', async () => {
      const dto = { userId: 1, cardName: 'Test' };
      const result = await service.create(dto);

      expect(result.status).toBe('PENDING');
      expect(result.userId).toBe(1);
    });
  });
});
```

## Review de Code

### Checklist pour les Reviewers

- [ ] Le code suit les standards du projet
- [ ] Les tests passent
- [ ] La documentation est a jour
- [ ] Pas de console.log ou debug oublies
- [ ] Les erreurs sont gerees correctement
- [ ] Le code est lisible et maintenable

### Checklist pour les Auteurs

- [ ] J'ai teste mes modifications localement
- [ ] J'ai ajoute des tests si necessaire
- [ ] J'ai mis a jour la documentation
- [ ] Mon code suit les conventions
- [ ] Les commits sont bien formates
- [ ] La PR a une description claire

## Structure du Projet

```
pokemon/
├── apps/
│   ├── api/          # Backend NestJS
│   ├── mobile/       # App React Native
│   └── web/          # Interface Next.js
├── packages/
│   ├── ml/           # Service ML Python
│   └── types/        # Types partages
├── docs/             # Documentation
└── docker-compose.yml
```

## Environnement de Developpement

### Setup Initial

```bash
# 1. Cloner
git clone https://github.com/votre-fork/card-analyser.git

# 2. Installer les dependances
npm install

# 3. Demarrer PostgreSQL
docker compose up -d

# 4. Setup l'API
cd apps/api
cp .env.example .env
npx prisma migrate dev
npm run start:dev

# 5. Setup le service ML (autre terminal)
cd packages/ml
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Outils Recommandes

- **VS Code** avec extensions:
  - ESLint
  - Prettier
  - Prisma
  - Python

- **Postman** ou **Insomnia** pour tester l'API

- **DBeaver** ou **pgAdmin** pour PostgreSQL

## Obtenir de l'Aide

- Ouvrez une issue sur GitHub
- Consultez la documentation existante
- Regardez les issues fermees pour des solutions

## Reconnaissance

Les contributeurs sont mentionnes dans le fichier README et les notes de version.

Merci de contribuer au projet Card Grading!
