# Card Grading System - Contexte Projet

## Objectif

Système de certification automatique de cartes à collectionner (Pokémon, sports) selon les standards PCA/PSA. L'utilisateur photographie sa carte et obtient une estimation de grade.

## Stack technique

- **API**: NestJS + TypeScript + @tensorflow/tfjs-node
- **Web**: Next.js 14 + TypeScript + Tailwind
- **Mobile**: React Native + TypeScript
- **ML**: TensorFlow/Python (modèle) → export tfjs-node

## Structure monorepo

```
/
├── apps/
│   ├── api/          # NestJS backend
│   ├── mobile/       # React Native app
│   └── web/          # Next.js frontend
├── packages/
│   ├── ml/           # Modèles TensorFlow
│   └── types/        # Types partagés
└── .claude/
    ├── agents/       # Sub-agents spécialisés
    └── docs/
    └────/tasks/      # Plans
    └────context.md   # Context du projet
```

## Flux utilisateurs

**Flux 1 - Web + QR Code:**
```
Web affiche QR → Mobile scanne → Mobile photo recto/verso → API analyse → Web affiche résultat
```

**Flux 2 - Mobile standalone:**
```
Mobile photo recto/verso → API analyse → Mobile affiche résultat
```

## Critères de grading PCA

5 critères notés de 1 à 10 :
- Centrage (Centering)
- Coins (Corners)
- Arêtes (Edges)
- Surface
- Qualité impression (Print Quality)

**Note finale = MIN(tous les scores)**

Échelle :
- 10 = Gem Mint
- 9 = Mint
- 8 = Near Mint / Mint
- 7 = Near Mint
- 6 = Excellent
- ≤5 = Joué/endommagé

## Règle absolue

Aucune logique de notation en dur côté client (web/mobile). Tout calcul vient du backend.

## Agents disponibles

| Agent | Rôle |
|-------|------|
| `tensorflow-ml-agent` | Planification modèle ML et preprocessing |
| `react-native-mobile-agent` | Planification app mobile |
| `nestjs-expert-agent` | Planification API backend |
| `nextjs-expert-agent` | Planification interface web |

## État actuel

- [x] Structure monorepo créée
- [x] POC React fonctionnel
- [ ] API NestJS avec TensorFlow
- [ ] Interface web avec QR code
- [ ] App mobile avec caméra
- [ ] Modèle ML entraîné

## Tâches en cours

_(Mis à jour par les sub-agents)_

---
*Dernière mise à jour : [date]*