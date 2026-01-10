# Guide d'Installation

Ce guide vous accompagne dans l'installation complete du projet Card Grading.

## Prerequis

### Obligatoires

| Outil | Version | Verification |
|-------|---------|--------------|
| Node.js | >= 18.0.0 | `node --version` |
| npm | >= 9.0.0 | `npm --version` |
| Python | >= 3.10 | `python3 --version` |
| Docker | >= 20.0.0 | `docker --version` |
| Docker Compose | >= 2.0.0 | `docker compose version` |

### Optionnels

| Outil | Usage |
|-------|-------|
| Git | Clonage du repository |
| VS Code | IDE recommande |
| Postman | Test des APIs |

## Installation Rapide

```bash
# 1. Cloner le projet
git clone https://github.com/votre-repo/pokemon.git
cd pokemon

# 2. Installer les dependances
npm install

# 3. Demarrer PostgreSQL
docker-compose up -d

# 4. Configurer et demarrer l'API
cd apps/api
cp .env.example .env
npx prisma migrate dev
npm run start:dev

# 5. Dans un autre terminal, demarrer le service ML
cd packages/ml
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

## Installation Detaillee

### Etape 1: Cloner le Repository

```bash
git clone https://github.com/votre-repo/pokemon.git
cd pokemon
```

### Etape 2: Installer les Dependances Node.js

```bash
# A la racine du projet (installe tout le monorepo)
npm install
```

Cette commande installe les dependances de:
- `apps/api` (NestJS)
- `apps/web` (Next.js)
- `apps/mobile` (React Native)

### Etape 3: Demarrer PostgreSQL avec Docker

```bash
# Demarrer le conteneur
docker-compose up -d

# Verifier que le conteneur est en cours d'execution
docker ps
```

Vous devriez voir:
```
CONTAINER ID   IMAGE         STATUS                   PORTS                    NAMES
abc123...      postgres:15   Up X minutes (healthy)   0.0.0.0:5432->5432/tcp   pokemon-postgres
```

### Etape 4: Configurer l'API NestJS

```bash
cd apps/api

# Copier le fichier d'environnement
cp .env.example .env
```

Editez le fichier `.env` si necessaire:

```env
# Base de donnees
DATABASE_URL="postgresql://pokemon:pokemon_password@localhost:5432/pokemon_db?schema=public"

# Service ML
ML_SERVICE_URL=http://localhost:5000
ML_API_KEY=dev-api-key-change-in-production
ML_TIMEOUT=30000
ML_MAX_RETRIES=3
ML_ENABLE_FALLBACK=true
```

### Etape 5: Initialiser la Base de Donnees

```bash
# Toujours dans apps/api

# Generer le client Prisma
npx prisma generate

# Appliquer les migrations
npx prisma migrate dev
```

Si c'est la premiere fois, entrez un nom pour la migration (ex: "init").

### Etape 6: Demarrer l'API NestJS

```bash
# Mode developpement (avec hot-reload)
npm run start:dev
```

L'API est disponible sur: **http://localhost:3000**

Documentation Swagger: **http://localhost:3000/api/docs**

### Etape 7: Configurer le Service ML

```bash
# Dans un nouveau terminal
cd packages/ml

# Creer l'environnement virtuel Python
python3 -m venv venv

# Activer l'environnement
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Installer les dependances
pip install -r requirements.txt
```

Configurer le fichier `.env`:

```bash
cp .env.example .env
```

```env
ML_HOST=0.0.0.0
ML_PORT=5000
ML_DEBUG=true
ML_API_KEY=dev-api-key-change-in-production
ML_MODEL_PATH=models/tfjs/mvp-v1
ML_USE_GPU=false
ML_UPLOADS_PATH=/chemin/absolu/vers/apps/api/uploads
```

### Etape 8: Demarrer le Service ML

```bash
# S'assurer que l'environnement virtuel est active
source venv/bin/activate

# Lancer le service
python main.py
```

Le service ML est disponible sur: **http://localhost:5000**

Documentation Swagger: **http://localhost:5000/docs**

## Verification de l'Installation

### Tester l'API NestJS

```bash
# Health check
curl http://localhost:3000/health

# Swagger UI
open http://localhost:3000/api/docs
```

### Tester le Service ML

```bash
# Health check
curl http://localhost:5000/health

# Reponse attendue
# {"status":"ok","model_loaded":true,"version":"1.0.0",...}
```

### Tester la Communication API ↔ ML

```bash
# Depuis l'API NestJS
curl http://localhost:3000/ml/health

# Devrait retourner le status du service ML
```

## Structure du Projet

```
pokemon/
├── apps/
│   ├── api/                 # API NestJS (port 3000)
│   │   ├── prisma/          # Schema et migrations
│   │   ├── src/             # Code source
│   │   └── uploads/         # Images uploadees
│   ├── mobile/              # App React Native
│   └── web/                 # Interface Next.js
├── packages/
│   ├── ml/                  # Service ML Python (port 5000)
│   └── types/               # Types partages
├── docs/                    # Documentation
├── docker-compose.yml       # PostgreSQL
└── package.json             # Monorepo config
```

## Ports Utilises

| Service | Port | URL |
|---------|------|-----|
| API NestJS | 3000 | http://localhost:3000 |
| Service ML | 5000 | http://localhost:5000 |
| PostgreSQL | 5432 | localhost:5432 |
| App Mobile (Expo) | 8081 | http://localhost:8081 |
| Interface Web | 3001 | http://localhost:3001 |

## Commandes Utiles

### Docker / PostgreSQL

```bash
# Demarrer PostgreSQL
docker-compose up -d

# Arreter PostgreSQL
docker-compose down

# Voir les logs
docker-compose logs -f postgres

# Reinitialiser completement (supprime les donnees)
docker-compose down -v && docker-compose up -d
```

### API NestJS

```bash
cd apps/api

# Developpement
npm run start:dev

# Production
npm run build && npm run start:prod

# Tests
npm run test

# Prisma Studio (GUI base de donnees)
npx prisma studio
```

### Service ML

```bash
cd packages/ml
source venv/bin/activate

# Lancer le service
python main.py

# Tests
pytest tests/
```

## Depannage

### PostgreSQL ne demarre pas

```bash
# Verifier les logs
docker-compose logs postgres

# Verifier si le port 5432 est deja utilise
lsof -i :5432

# Redemarrer
docker-compose restart
```

### Erreur de connexion a la base de donnees

```bash
# Verifier que PostgreSQL fonctionne
docker ps | grep postgres

# Verifier la DATABASE_URL
cat apps/api/.env

# Tester la connexion manuellement
docker exec -it pokemon-postgres psql -U pokemon -d pokemon_db -c "SELECT 1"
```

### Client Prisma non genere

```bash
cd apps/api
npx prisma generate
```

### Port 3000 deja utilise

```bash
# Trouver le processus
lsof -i :3000

# Arreter le processus
kill -9 <PID>
```

### Service ML ne demarre pas

```bash
# Verifier que l'environnement virtuel est active
which python  # Doit pointer vers venv/bin/python

# Reinstaller les dependances
pip install -r requirements.txt --force-reinstall
```

### Erreur de communication API → ML

```bash
# Verifier que le service ML est en cours d'execution
curl http://localhost:5000/health

# Verifier la configuration dans apps/api/.env
# ML_SERVICE_URL=http://localhost:5000
# ML_API_KEY doit correspondre dans les deux .env
```

## Prochaines Etapes

1. **Tester le workflow complet**: Creer une session, uploader des images, lancer l'analyse
2. **Explorer Swagger**: Tester les endpoints via http://localhost:3000/api/docs
3. **Consulter l'architecture**: [docs/architecture/overview.md](../architecture/overview.md)

## Liens Utiles

- [Documentation Architecture](../architecture/overview.md)
- [README API](../../apps/api/README.md)
- [README Service ML](../../packages/ml/README.md)
- [Documentation Prisma](https://www.prisma.io/docs)
- [Documentation NestJS](https://docs.nestjs.com)
- [Documentation FastAPI](https://fastapi.tiangolo.com)
