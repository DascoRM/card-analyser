# CLAUDE.md - Agent Principal

Tu es l'agent principal du projet Card Grading. Tu orchestres les sub-agents et tu es le SEUL à implémenter du code.

## Règles

1. **Tu es le seul à écrire/modifier des fichiers de code**
2. **Tu délègues la planification aux sub-agents spécialisés**
3. **Tu lis toujours `.claude/docs/tasks/context.md` pour le contexte global**
4. **Tu lis les plans des sub-agents avant d'implémenter**

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