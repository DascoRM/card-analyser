# Configuration de la base de données PostgreSQL avec Docker et Prisma

Ce document explique comment configurer et utiliser PostgreSQL avec Docker et Prisma dans l'API NestJS.

## Structure des fichiers

```
pokemon/
├── docker-compose.yml           # Configuration Docker pour PostgreSQL
├── apps/
│   └── api/
│       ├── .env                 # Variables d'environnement (non versionné)
│       ├── .env.example         # Exemple de configuration
│       ├── prisma/
│       │   └── schema.prisma    # Schéma de base de données Prisma
│       └── src/
│           └── prisma/
│               ├── prisma.module.ts   # Module Prisma pour NestJS
│               ├── prisma.service.ts  # Service Prisma avec DI
│               └── index.ts           # Exports
```

## Démarrage de PostgreSQL avec Docker

### 1. Lancer le conteneur PostgreSQL

```bash
# À la racine du projet
docker-compose up -d
```

Cette commande va :
- Télécharger l'image PostgreSQL 16 Alpine si nécessaire
- Créer un conteneur nommé `pokemon-postgres`
- Créer une base de données `pokemon_db`
- Créer un utilisateur `pokemon` avec le mot de passe `pokemon_password`
- Exposer le port 5432
- Créer un volume persistant pour les données

### 2. Vérifier que le conteneur fonctionne

```bash
docker ps
```

Vous devriez voir le conteneur `pokemon-postgres` en cours d'exécution.

### 3. Vérifier la santé du conteneur

```bash
docker-compose ps
```

Le statut devrait être "healthy" après quelques secondes.

## Configuration de Prisma

### 1. Variables d'environnement

Le fichier `.env` dans `apps/api/` contient la connexion à la base de données :

```env
DATABASE_URL="postgresql://pokemon:pokemon_password@localhost:5432/pokemon_db?schema=public"
```

Note : Avec Prisma 7.2.0, l'URL de connexion est maintenant configurée dans `prisma.config.ts` et non plus dans le schéma.

### 2. Configuration Prisma (prisma.config.ts)

Ce fichier charge automatiquement les variables d'environnement depuis le fichier `.env` :

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

### 3. Schéma Prisma

Le fichier `prisma/schema.prisma` définit la configuration Prisma et les modèles de données.

Exemple de modèle à ajouter :

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 3. Générer le client Prisma

Après avoir défini vos modèles, générez le client Prisma :

```bash
cd apps/api
npm run prisma:generate
```

### 4. Créer et appliquer une migration

```bash
cd apps/api
npm run prisma:migrate
```

Cette commande va :
- Créer un fichier de migration
- Appliquer la migration à la base de données
- Régénérer le client Prisma

## Utilisation dans NestJS

### PrismaService

Le `PrismaService` est un service global qui étend `PrismaClient` et gère automatiquement la connexion et la déconnexion.

Caractéristiques :
- **Adapter PostgreSQL** : Utilise `@prisma/adapter-pg` pour se connecter à PostgreSQL (requis avec Prisma 7.2.0)
- **Pool de connexions** : Utilise le module `pg` pour gérer le pool de connexions
- **OnModuleInit** : Se connecte automatiquement à la base de données au démarrage
- **OnModuleDestroy** : Se déconnecte automatiquement lors de l'arrêt
- **Logging** : Enregistre les requêtes, infos, avertissements et erreurs
- **cleanDatabase()** : Méthode utilitaire pour nettoyer la base de données en développement/test

Code du PrismaService :

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### PrismaModule

Le `PrismaModule` est marqué comme `@Global()`, ce qui signifie qu'il est disponible dans toute l'application sans avoir à l'importer dans chaque module.

### Exemple d'utilisation

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: { email: string; name?: string }) {
    return this.prisma.user.create({
      data,
    });
  }

  async update(id: number, data: { email?: string; name?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
```

## Scripts disponibles

### Prisma CLI

```bash
# Générer le client Prisma après modification du schéma
npm run prisma:generate

# Créer et appliquer une nouvelle migration
npm run prisma:migrate

# Pousser le schéma vers la base de données (sans migration)
npm run prisma:push

# Ouvrir Prisma Studio (interface web pour gérer les données)
npm run prisma:studio

# Exécuter le script de seed
npm run prisma:seed
```

### Commandes Docker

```bash
# Démarrer PostgreSQL
docker-compose up -d

# Arrêter PostgreSQL
docker-compose down

# Arrêter et supprimer les volumes (attention : supprime les données)
docker-compose down -v

# Voir les logs
docker-compose logs -f postgres

# Se connecter à PostgreSQL avec psql
docker exec -it pokemon-postgres psql -U pokemon -d pokemon_db
```

## Workflow de développement

1. **Modifier le schéma** : Éditez `prisma/schema.prisma`
2. **Créer une migration** : `npm run prisma:migrate`
3. **Le client est régénéré automatiquement**
4. **Utiliser le nouveau modèle** dans vos services

## Bonnes pratiques

### 1. Injection de dépendances

Toujours injecter `PrismaService` via le constructeur :

```typescript
constructor(private readonly prisma: PrismaService) {}
```

### 2. Gestion des erreurs

Utilisez des filtres d'exception pour gérer les erreurs Prisma :

```typescript
import { Catch, ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    switch (exception.code) {
      case 'P2002':
        response.status(409).json({
          statusCode: 409,
          message: 'Unique constraint violation',
        });
        break;
      case 'P2025':
        response.status(404).json({
          statusCode: 404,
          message: 'Record not found',
        });
        break;
      default:
        response.status(500).json({
          statusCode: 500,
          message: 'Internal server error',
        });
    }
  }
}
```

### 3. Transactions

Utilisez les transactions pour les opérations atomiques :

```typescript
async createUserWithProfile(userData: any, profileData: any) {
  return this.prisma.$transaction(async (prisma) => {
    const user = await prisma.user.create({ data: userData });
    const profile = await prisma.profile.create({
      data: { ...profileData, userId: user.id },
    });
    return { user, profile };
  });
}
```

### 4. Tests

Pour les tests, vous pouvez utiliser la méthode `cleanDatabase()` :

```typescript
beforeEach(async () => {
  await prismaService.cleanDatabase();
});
```

## Dépannage

### Erreur de connexion

Si vous obtenez une erreur de connexion, vérifiez que :
1. Docker est en cours d'exécution
2. Le conteneur PostgreSQL est démarré : `docker ps`
3. La DATABASE_URL est correcte dans `.env`
4. Le port 5432 n'est pas déjà utilisé : `lsof -i :5432`

### Régénérer la base de données

Si vous voulez repartir de zéro :

```bash
# Arrêter et supprimer les volumes
docker-compose down -v

# Redémarrer PostgreSQL
docker-compose up -d

# Recréer les migrations
cd apps/api
npm run prisma:migrate
```

## Ressources

- [Documentation Prisma](https://www.prisma.io/docs)
- [Documentation NestJS](https://docs.nestjs.com)
- [Documentation PostgreSQL](https://www.postgresql.org/docs/)
- [Guide Prisma + NestJS](https://docs.nestjs.com/recipes/prisma)
