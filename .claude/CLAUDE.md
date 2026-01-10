# CLAUDE.md - Agent Principal

Tu es l'agent principal du projet Card Grading. Tu orchestres les sub-agents et tu es le SEUL à implémenter du code.

## Règles

1. **Tu es le seul à écrire/modifier des fichiers de code**
2. **Tu délègues la planification aux sub-agents spécialisés**
3. **Tu lis toujours `.claude/docs/tasks/context.md` pour le contexte global**
4. **Tu lis les plans des sub-agents avant d'implémenter**

## Workflow Git

Avant chaque tâche :
1. Créer une branche : `git checkout -b feature/[nom-tâche]`
2. Implémenter selon le plan
3. Commit réguliers avec messages clairs
4. Push quand la tâche est terminée

Format commits : `type(scope): description`
- feat(api): add sessions module
- feat(web): add QR code page
- fix(mobile): camera permissions


## Documentation du projet
Tous dois être documenter de maniere simple mais comprehensible
On différencie trois documentation
1. La documentation par projet type README.md (pour run les projet, concept type migration, build et autres)
2. La documentation technique. Celle qui permet de comprendre l'architeture et finesse du projet
3. La documentation fonctionnel, orienté utour du produit / métier

- Chaque projet doit avoir ça dsocumentation a jour 
- La documentation technique doit être régulierement mis a jour et ajouter dans .claude/docs/technical/ Format : [projet]-documentation-technical. La documentation sera en Français
- La documentation fonctionel doit être mis a jour et ajouter dans .claude/docs/functionnal/ Format : [fonctionnalité]-documentation-functionnal. La documentation sera en Français

## Sub-agents disponibles

| Agent | Expertise | Quand l'utiliser |
|-------|-----------|------------------|
| `tensorflow-ml-agent` | ML, TensorFlow, Python | Modèle IA, preprocessing images |
| `react-native-mobile-agent` | React Native, caméra, permissions | App mobile iOS/Android |
| `nestjs-expert-agent` | NestJS, API REST, WebSocket | Backend, endpoints, services |
| `nextjs-expert-agent` | Next.js, React, Tailwind | Interface web |

## Workflow

```
1. Recevoir une tâche
2. Identifier le(s) sub-agent(s) concerné(s)
3. Déléguer la planification au sub-agent
4. Lire le plan généré dans .claude/docs/tasks/[task]-plan.md
5. Implémenter en suivant le plan
6. Mettre à jour context.md si nécessaire
```

## Comment déléguer

Quand tu délègues à un sub-agent, dis-lui :
- La tâche à planifier
- Le chemin vers context.md
- Où écrire son plan

## Structure projet

```
apps/api/       → NestJS backend
apps/mobile/    → React Native
apps/web/       → Next.js
packages/ml/    → TensorFlow models
packages/types/ → Types partagés
```

## Règle métier importante

Aucune logique de notation côté client. Tout calcul de grade PCA/PSA vient du backend.