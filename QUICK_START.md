# Quick Start - Configuration PostgreSQL + Prisma + NestJS

Guide rapide pour démarrer avec la base de données PostgreSQL, Prisma et l'API NestJS.

## Prérequis

- Node.js >= 18.0.0
- Docker et Docker Compose installés
- npm ou yarn

## Installation rapide

### 1. Démarrer PostgreSQL avec Docker

```bash
# À la racine du projet
docker-compose up -d

# Vérifier que le conteneur fonctionne
docker ps
```

Vous devriez voir le conteneur `pokemon-postgres` en état "healthy".

### 2. Installer les dépendances

```bash
# À la racine du projet (pour tout le monorepo)
npm install

# OU seulement pour l'API
cd apps/api
npm install
```

### 3. Générer le client Prisma

```bash
cd apps/api
npm run prisma:generate
```

### 4. Pousser le schéma vers la base de données

```bash
# Option 1 : Push direct (sans créer de migration)
npm run prisma:push

# Option 2 : Créer une migration
npm run prisma:migrate
# Entrer un nom pour la migration quand demandé
```

### 5. Démarrer l'API NestJS

```bash
# En mode développement
npm run start:dev

# OU en mode production
npm run build
npm run start:prod
```

L'API démarre sur `http://localhost:3000`

### 6. Tester la connexion à la base de données

```bash
# Tester l'endpoint de santé de la base de données
curl http://localhost:3000/health/db

# Réponse attendue :
# {"connected":true,"users":0}
```

## Commandes utiles

### Docker

```bash
# Voir les logs PostgreSQL
docker-compose logs -f postgres

# Arrêter PostgreSQL
docker-compose down

# Redémarrer PostgreSQL (conserve les données)
docker-compose restart

# Supprimer PostgreSQL et ses données
docker-compose down -v
```

### Prisma

```bash
# Ouvrir Prisma Studio (interface web pour gérer les données)
npm run prisma:studio

# Générer le client après modification du schéma
npm run prisma:generate

# Créer une nouvelle migration
npm run prisma:migrate

# Pousser le schéma sans créer de migration
npm run prisma:push
```

### API NestJS

```bash
# Démarrer en mode développement (avec hot-reload)
npm run start:dev

# Démarrer en mode debug
npm run start:debug

# Builder l'application
npm run build

# Lancer les tests
npm run test

# Lancer les tests e2e
npm run test:e2e
```

## Structure des fichiers créés

```
pokemon/
├── docker-compose.yml                    # Configuration Docker PostgreSQL
├── DATABASE_SETUP.md                     # Documentation détaillée
├── QUICK_START.md                        # Ce fichier
└── apps/
    └── api/
        ├── .env                          # Variables d'environnement
        ├── .env.example                  # Exemple de configuration
        ├── prisma.config.ts              # Configuration Prisma
        ├── prisma/
        │   ├── schema.prisma             # Schéma de base de données
        │   └── migrations/               # Migrations (si créées)
        └── src/
            └── prisma/
                ├── prisma.module.ts      # Module Prisma NestJS
                ├── prisma.service.ts     # Service Prisma
                └── index.ts              # Exports
```

## Dépendances installées

### Dépendances de production
- `@prisma/client` (7.2.0) - Client Prisma
- `@prisma/adapter-pg` - Adapter PostgreSQL pour Prisma 7
- `pg` - Driver PostgreSQL
- `@nestjs/config` - Module de configuration NestJS

### Dépendances de développement
- `prisma` (7.2.0) - CLI Prisma
- `dotenv` - Chargement des variables d'environnement
- `@types/pg` - Types TypeScript pour pg

## Variables d'environnement

Le fichier `.env` dans `apps/api/` :

```env
DATABASE_URL="postgresql://pokemon:pokemon_password@localhost:5432/pokemon_db?schema=public"
```

Pour la production, modifiez ces valeurs en fonction de votre configuration.

## Prochaines étapes

1. Définir vos modèles de données dans `prisma/schema.prisma`
2. Créer des migrations avec `npm run prisma:migrate`
3. Créer vos modules, contrôleurs et services NestJS
4. Injecter `PrismaService` dans vos services pour accéder à la base de données

Consultez `DATABASE_SETUP.md` pour plus de détails sur la configuration et l'utilisation.

## Dépannage rapide

### Le conteneur PostgreSQL ne démarre pas
```bash
# Vérifier les logs
docker-compose logs postgres

# Redémarrer
docker-compose restart
```

### Erreur de connexion à la base de données
```bash
# Vérifier que PostgreSQL est en cours d'exécution
docker ps

# Vérifier que la DATABASE_URL est correcte dans .env
cat apps/api/.env

# Tester la connexion manuellement
docker exec -it pokemon-postgres psql -U pokemon -d pokemon_db
```

### Le client Prisma n'est pas à jour
```bash
cd apps/api
npm run prisma:generate
```

### Port 3000 déjà utilisé
```bash
# Trouver le processus
lsof -i :3000

# Tuer le processus
kill -9 <PID>
```

## Support

Pour plus d'informations, consultez :
- Documentation complète : `DATABASE_SETUP.md`
- [Documentation Prisma](https://www.prisma.io/docs)
- [Documentation NestJS](https://docs.nestjs.com)
