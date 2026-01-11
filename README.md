# Card Grading - Certification Automatique de Cartes

> Application de notation automatique de cartes a collectionner utilisant l'intelligence artificielle pour fournir des grades compatibles PCA/PSA.

## Fonctionnalites

- Capture photo haute qualite (recto/verso)
- Analyse IA locale via TensorFlow
- Notation multi-criteres : centrage, coins, bords, surface, qualite d'impression
- Grades compatibles avec les standards PCA/PSA (1-10)
- Interface mobile et web

## Stack Technique

| Composant | Technologie | Port |
|-----------|-------------|------|
| API Backend | NestJS + Prisma | 3000 |
| Service ML | FastAPI + TensorFlow | 5000 |
| App Mobile | React Native + Expo | 8081 |
| Interface Web | Next.js | 3001 |
| Base de donnees | PostgreSQL | 5432 |

## Structure du Projet

```
pokemon/
├── apps/
│   ├── api/          # Backend NestJS - API REST
│   ├── mobile/       # Application React Native
│   └── web/          # Interface Next.js
├── packages/
│   ├── ml/           # Service ML Python (FastAPI + TensorFlow)
│   └── types/        # Types TypeScript partages
└── docs/             # Documentation technique
```

## Quick Start

### Prerequis

- Node.js >= 18
- Python >= 3.10
- Docker & Docker Compose

### Installation Rapide

```bash
# Cloner le repository
git clone https://github.com/votre-repo/pokemon.git
cd pokemon

# Installer les dependances Node.js
npm install

# Demarrer PostgreSQL avec Docker
docker-compose up -d

# Configurer l'API
cd apps/api
cp .env.example .env
npx prisma migrate dev

# Demarrer l'API
npm run start:dev
```

### Demarrer le Service ML

```bash
cd packages/ml

# Creer l'environnement Python
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou: venv\Scripts\activate  # Windows

# Installer les dependances
pip install -r requirements.txt

# Lancer le service
python main.py
```

## Documentation

| Document | Description |
|----------|-------------|
| [Guide d'installation](docs/getting-started/installation.md) | Installation complete pas a pas |
| [Architecture](docs/architecture/overview.md) | Vue d'ensemble de l'architecture |
| [API Reference](http://localhost:3000/api/docs) | Documentation Swagger interactive |
| [Service ML](packages/ml/README.md) | Documentation du service Python |
| [App Mobile](apps/mobile/README.md) | Guide de l'application mobile |

## Workflow de Grading

```
1. Creer une session de grading
2. Uploader l'image recto de la carte
3. Uploader l'image verso de la carte
4. Lancer l'analyse ML
5. Recuperer les resultats (grades par critere + note finale)
```

## API Endpoints Principaux

| Methode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/sessions` | Creer une session |
| POST | `/sessions/:id/images` | Uploader une image |
| POST | `/sessions/:id/analyze` | Lancer l'analyse |
| GET | `/sessions/:id/results` | Recuperer les resultats |

Documentation complete: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

## Variables d'Environnement

### API (apps/api/.env)

| Variable | Description | Valeur par defaut |
|----------|-------------|-------------------|
| DATABASE_URL | URL PostgreSQL | postgresql://... |
| ML_SERVICE_URL | URL du service ML | http://localhost:5000 |
| ML_API_KEY | Cle API pour le service ML | - |
| ML_TIMEOUT | Timeout des appels ML (ms) | 30000 |

### ML Service (packages/ml/.env)

| Variable | Description | Valeur par defaut |
|----------|-------------|-------------------|
| ML_HOST | Host du serveur | 0.0.0.0 |
| ML_PORT | Port du serveur | 5000 |
| ML_API_KEY | Cle API attendue | - |
| ML_MODEL_PATH | Chemin vers le modele | models/tfjs/mvp-v1 |

## Developpement

### Commandes Utiles

```bash
# API - Developpement
cd apps/api && npm run start:dev

# API - Build
cd apps/api && npm run build

# API - Tests
cd apps/api && npm run test

# Prisma - Migrations
cd apps/api && npx prisma migrate dev

# Prisma - Studio (GUI)
cd apps/api && npx prisma studio
```

## Contribution

1. Creer une branche: `git checkout -b feature/ma-feature`
2. Committer: `git commit -m "feat(scope): description"`
3. Pousser: `git push origin feature/ma-feature`
4. Ouvrir une Pull Request

Format des commits: `type(scope): description`
- `feat`: Nouvelle fonctionnalite
- `fix`: Correction de bug
- `docs`: Documentation
- `refactor`: Refactoring

## License

MIT
