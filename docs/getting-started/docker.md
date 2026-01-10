# Guide Docker

Ce guide couvre l'utilisation de Docker pour le projet Card Grading.

## Vue d'Ensemble

Le projet utilise Docker pour:
- **PostgreSQL**: Base de donnees principale
- **API NestJS**: Backend (optionnel, developpement local possible)
- **Service ML**: Service Python (optionnel, developpement local possible)

## Prerequis

```bash
# Verifier Docker
docker --version
# Docker version 24.0.0 ou superieur

# Verifier Docker Compose
docker compose version
# Docker Compose version v2.20.0 ou superieur
```

## Configuration Actuelle

### docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: pokemon-postgres
    restart: always
    environment:
      POSTGRES_USER: pokemon
      POSTGRES_PASSWORD: pokemon_password
      POSTGRES_DB: pokemon_db
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U pokemon -d pokemon_db']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
```

## Commandes de Base

### Demarrer les Services

```bash
# Demarrer en arriere-plan
docker compose up -d

# Demarrer avec logs visibles
docker compose up

# Demarrer un service specifique
docker compose up -d postgres
```

### Arreter les Services

```bash
# Arreter tous les services
docker compose down

# Arreter et supprimer les volumes (ATTENTION: perte de donnees)
docker compose down -v
```

### Voir les Logs

```bash
# Logs de tous les services
docker compose logs

# Logs d'un service specifique
docker compose logs postgres

# Suivre les logs en temps reel
docker compose logs -f postgres
```

### Etat des Services

```bash
# Liste des conteneurs
docker compose ps

# Statistiques d'utilisation
docker stats
```

## PostgreSQL

### Connexion a la Base de Donnees

```bash
# Via Docker
docker exec -it pokemon-postgres psql -U pokemon -d pokemon_db

# Via psql local (si installe)
psql postgresql://pokemon:pokemon_password@localhost:5432/pokemon_db
```

### Commandes SQL Utiles

```sql
-- Lister les tables
\dt

-- Decrire une table
\d users

-- Voir les sessions
SELECT * FROM "Session" LIMIT 10;

-- Compter les enregistrements
SELECT COUNT(*) FROM "Session";

-- Quitter
\q
```

### Backup et Restore

```bash
# Backup
docker exec pokemon-postgres pg_dump -U pokemon pokemon_db > backup.sql

# Restore
cat backup.sql | docker exec -i pokemon-postgres psql -U pokemon pokemon_db
```

### Reset de la Base de Donnees

```bash
# Option 1: Supprimer le volume
docker compose down -v
docker compose up -d

# Option 2: Via Prisma
cd apps/api
npx prisma migrate reset
```

## Configuration Complete (Production)

Pour une configuration complete avec tous les services:

### docker-compose.full.yml

```yaml
version: '3.8'

services:
  # Base de donnees
  postgres:
    image: postgres:16-alpine
    container_name: cardgrading-postgres
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER:-pokemon}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-pokemon_password}
      POSTGRES_DB: ${DB_NAME:-pokemon_db}
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U pokemon -d pokemon_db']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - cardgrading

  # API NestJS
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    container_name: cardgrading-api
    restart: always
    environment:
      DATABASE_URL: postgresql://${DB_USER:-pokemon}:${DB_PASSWORD:-pokemon_password}@postgres:5432/${DB_NAME:-pokemon_db}
      ML_SERVICE_URL: http://ml:5000
      ML_API_KEY: ${ML_API_KEY:-dev-api-key}
      ML_TIMEOUT: 30000
      ML_ENABLE_FALLBACK: 'true'
    ports:
      - '3000:3000'
    volumes:
      - uploads_data:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - cardgrading

  # Service ML
  ml:
    build:
      context: ./packages/ml
      dockerfile: Dockerfile
    container_name: cardgrading-ml
    restart: always
    environment:
      ML_HOST: 0.0.0.0
      ML_PORT: 5000
      ML_API_KEY: ${ML_API_KEY:-dev-api-key}
      ML_UPLOADS_PATH: /uploads
    ports:
      - '5000:5000'
    volumes:
      - uploads_data:/uploads:ro
      - models_data:/app/models
    networks:
      - cardgrading

volumes:
  postgres_data:
    driver: local
  uploads_data:
    driver: local
  models_data:
    driver: local

networks:
  cardgrading:
    driver: bridge
```

### Dockerfile pour l'API (apps/api/Dockerfile)

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de dependances
COPY package*.json ./
COPY prisma ./prisma/

# Installer les dependances
RUN npm ci

# Copier le code source
COPY . .

# Generer le client Prisma
RUN npx prisma generate

# Build
RUN npm run build

# Production
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Creer le dossier uploads
RUN mkdir -p /app/uploads

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

### Dockerfile pour le Service ML (packages/ml/Dockerfile)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Installer les dependances systeme
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copier les dependances
COPY requirements.txt .

# Installer les dependances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code source
COPY . .

EXPOSE 5000

CMD ["python", "main.py"]
```

## Variables d'Environnement

Creer un fichier `.env` a la racine:

```env
# Database
DB_USER=pokemon
DB_PASSWORD=secure_password_here
DB_NAME=pokemon_db

# ML Service
ML_API_KEY=your_secure_api_key

# Environment
NODE_ENV=production
```

## Utilisation

### Developpement

```bash
# Demarrer seulement PostgreSQL
docker compose up -d postgres

# Lancer l'API localement
cd apps/api && npm run start:dev

# Lancer le service ML localement
cd packages/ml && python main.py
```

### Production

```bash
# Build et demarrer tous les services
docker compose -f docker-compose.full.yml up -d --build

# Voir les logs
docker compose -f docker-compose.full.yml logs -f

# Arreter
docker compose -f docker-compose.full.yml down
```

## Networking

### Ports Exposes

| Service | Port Interne | Port Externe |
|---------|--------------|--------------|
| PostgreSQL | 5432 | 5432 |
| API NestJS | 3000 | 3000 |
| Service ML | 5000 | 5000 |

### Communication Inter-Services

Dans Docker Compose, les services communiquent via leurs noms:

```
API → postgres:5432 (base de donnees)
API → ml:5000 (service ML)
```

## Volumes

### Volumes Persistants

| Volume | Usage | Path dans le conteneur |
|--------|-------|------------------------|
| `postgres_data` | Donnees PostgreSQL | /var/lib/postgresql/data |
| `uploads_data` | Images uploadees | /app/uploads |
| `models_data` | Modeles ML | /app/models |

### Gestion des Volumes

```bash
# Lister les volumes
docker volume ls

# Inspecter un volume
docker volume inspect pokemon_postgres_data

# Supprimer un volume (ATTENTION: perte de donnees)
docker volume rm pokemon_postgres_data

# Supprimer les volumes non utilises
docker volume prune
```

## Depannage

### Le conteneur ne demarre pas

```bash
# Voir les logs detailles
docker compose logs postgres

# Verifier l'etat
docker compose ps -a

# Redemarrer
docker compose restart postgres
```

### Port deja utilise

```bash
# Trouver le processus
lsof -i :5432

# Modifier le port dans docker-compose.yml
ports:
  - '5433:5432'  # Utiliser 5433 au lieu de 5432
```

### Probleme de permission sur les volumes

```bash
# Verifier les permissions
docker exec pokemon-postgres ls -la /var/lib/postgresql/data

# Recreer le volume
docker compose down -v
docker compose up -d
```

### Connexion refusee a la base de donnees

```bash
# Verifier que le conteneur est healthy
docker compose ps

# Tester la connexion
docker exec pokemon-postgres pg_isready -U pokemon

# Verifier les logs
docker compose logs postgres | grep -i error
```

## Monitoring

### Health Checks

```bash
# Etat des health checks
docker inspect --format='{{.State.Health.Status}}' pokemon-postgres

# Historique des health checks
docker inspect --format='{{json .State.Health}}' pokemon-postgres | jq
```

### Ressources

```bash
# Statistiques en temps reel
docker stats

# Utilisation disque
docker system df
```

## Nettoyage

```bash
# Supprimer les conteneurs arretes
docker container prune

# Supprimer les images non utilisees
docker image prune

# Supprimer les volumes non utilises
docker volume prune

# Nettoyage complet
docker system prune -a --volumes
```

## Liens

- [Guide d'installation](installation.md)
- [Documentation Architecture](../architecture/overview.md)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
