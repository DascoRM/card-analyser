# Plan Frontend - Affichage résultats de grading rule-based

**Agent**: nextjs-expert-agent
**Date**: 2026-01-12
**Version**: 1.0
**Contexte**: Mise à jour du frontend pour afficher les nouveaux champs du système de notation rule-based

---

## 1. État actuel du frontend

### 1.1 Architecture existante

**Structure des pages**:
```
apps/web/src/
├── app/
│   ├── page.tsx                              # Page d'accueil (desktop, génération QR)
│   ├── mobile/[sessionId]/page.tsx           # Upload photos mobile
│   └── mobile/[sessionId]/results/page.tsx   # Affichage résultats
├── components/
│   ├── mobile/
│   │   ├── GradeResultCard.tsx              # ✅ Composant principal résultats
│   │   ├── ImageUploader.tsx
│   │   └── AnalyzeButton.tsx
│   ├── desktop/
│   │   ├── QRCodeDisplay.tsx
│   │   └── SessionInfo.tsx
│   └── shared/
│       ├── LoadingSpinner.tsx
│       └── ErrorMessage.tsx
├── lib/
│   ├── types.ts                              # ✅ Types TypeScript
│   └── api.ts                                # API client
└── hooks/
    ├── useSession.ts
    ├── useImageUpload.ts
    └── useCreateSession.ts
```

### 1.2 Types actuels

**Interface `GradeResult` dans `/apps/web/src/lib/types.ts`**:
```typescript
export interface GradeResult {
  id: string;
  sessionId: string;
  scale: GradeScale;
  centering: number;        // ✅ Existe déjà
  corners: number;          // ✅ Existe déjà
  edges: number;            // ✅ Existe déjà
  surface: number;          // ✅ Existe déjà
  printQuality: number;     // ✅ Existe déjà
  finalGrade: number;       // ✅ Existe déjà
  gradeLabel: string;       // ✅ Existe déjà
  confidence?: number;      // ✅ Existe déjà
  modelVersion?: string;    // ✅ Existe déjà
  createdAt: string;
}
```

**Champs manquants à ajouter**:
- `method?: string` → Indique si c'est "rule_based" ou "ml_model"

### 1.3 Composant actuel `GradeResultCard`

**Localisation**: `/apps/web/src/components/mobile/GradeResultCard.tsx`

**Points forts**:
- ✅ Affiche déjà les 5 sous-critères avec barres de progression
- ✅ Affiche la note finale et le label
- ✅ Affiche la confiance du modèle
- ✅ Gradient de couleur selon la note (10=jaune, 9=vert, 8=bleu, etc.)
- ✅ UI moderne avec Tailwind CSS
- ✅ Utilise des émojis pour les critères (🎯 centrage, 📐 coins, etc.)

**Points à améliorer**:
- ❌ N'affiche pas la méthode utilisée (rule_based vs ml_model)
- ❌ N'affiche pas la version du modèle (`modelVersion`)
- ❌ Barres de progression simples (pourrait être plus visuel)
- ❌ Pas de comparaison avec standards PCA/PSA
- ❌ Pas d'explications sur les scores

---

## 2. Nouveaux champs de l'API

### 2.1 Réponse complète de l'API

```json
{
  "centering": 8.0,
  "corners": 7.5,
  "edges": 9.0,
  "surface": 10.0,
  "printQuality": 10.0,
  "finalGrade": 7.5,
  "gradeLabel": "Near Mint",
  "confidence": 0.85,
  "modelVersion": "rule-based-v1.0.0",
  "method": "rule_based"
}
```

### 2.2 Mapping des champs

| Champ API | Type frontend | Affichage |
|-----------|--------------|-----------|
| `centering` | `number` | Barre + note + emoji 🎯 |
| `corners` | `number` | Barre + note + emoji 📐 |
| `edges` | `number` | Barre + note + emoji 📏 |
| `surface` | `number` | Barre + note + emoji ✨ |
| `printQuality` | `number` | Barre + note + emoji 🖨️ |
| `finalGrade` | `number` | Note principale + couleur |
| `gradeLabel` | `string` | Label textuel (Near Mint, etc.) |
| `confidence` | `number` | % de confiance (déjà affiché) |
| `modelVersion` | `string` | Version (à ajouter en footer) |
| `method` | `string` | Badge "Analyse rule-based" |
| `scale` | `string` | PCA ou PSA (déjà affiché) |

---

## 3. Plan de mise à jour

### 3.1 Phase 1 - Mise à jour des types

**Fichier**: `/apps/web/src/lib/types.ts`

**Action**: Ajouter le champ `method` manquant

```typescript
export interface GradeResult {
  id: string;
  sessionId: string;
  scale: GradeScale;
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  printQuality: number;
  finalGrade: number;
  gradeLabel: string;
  confidence?: number;
  modelVersion?: string;
  method?: string;        // ← NOUVEAU
  createdAt: string;
}
```

### 3.2 Phase 2 - Amélioration du composant `GradeResultCard`

**Fichier**: `/apps/web/src/components/mobile/GradeResultCard.tsx`

#### A. Ajout d'un badge méthode

**Position**: Juste après le header avec la note finale

```tsx
{/* Badge méthode d'analyse */}
{result.method && (
  <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
    <div className="flex items-center justify-center gap-2">
      <span className="text-xs font-medium text-gray-600">
        Méthode:
      </span>
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        result.method === 'rule_based'
          ? 'bg-blue-100 text-blue-800'
          : 'bg-purple-100 text-purple-800'
      }`}>
        {result.method === 'rule_based' ? '📐 Règles métier' : '🤖 IA prédictive'}
      </span>
    </div>
  </div>
)}
```

#### B. Amélioration des barres de progression

**Actuel**: Barres simples avec gradient
**Amélioration**: Ajouter des paliers visuels (1-4, 5-6, 7-8, 9-10)

```tsx
{criteria.map((criterion) => (
  <div key={criterion.label} className="space-y-1">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xl">{criterion.icon}</span>
        <span className="text-sm font-medium text-gray-700">{criterion.label}</span>
      </div>
      <span className="text-lg font-bold text-gray-900">
        {criterion.value.toFixed(1)}
      </span>
    </div>

    {/* Barre avec paliers */}
    <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
      {/* Marqueurs de paliers */}
      <div className="absolute inset-0 flex">
        <div className="flex-1 border-r border-white"></div>
        <div className="flex-1 border-r border-white"></div>
        <div className="flex-1 border-r border-white"></div>
        <div className="flex-1"></div>
      </div>

      {/* Barre de progression */}
      <div
        className={`absolute inset-y-0 left-0 transition-all duration-500 ${
          criterion.value >= 9 ? 'bg-gradient-to-r from-green-400 to-green-500' :
          criterion.value >= 7 ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
          criterion.value >= 5 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
          'bg-gradient-to-r from-red-400 to-red-500'
        }`}
        style={{ width: `${criterion.value * 10}%` }}
      />
    </div>
  </div>
))}
```

#### C. Ajout section confiance améliorée

```tsx
{/* Section confiance et détails */}
<div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
  {/* Confiance */}
  {result.confidence && (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600 flex items-center gap-2">
        <span>🎯</span> Niveau de confiance
      </span>
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500"
            style={{ width: `${result.confidence * 100}%` }}
          />
        </div>
        <span className="text-sm font-bold text-gray-900">
          {(result.confidence * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  )}

  {/* Version du modèle */}
  {result.modelVersion && (
    <div className="flex items-center justify-between text-xs text-gray-500">
      <span>Version</span>
      <code className="px-2 py-1 bg-gray-100 rounded font-mono">
        {result.modelVersion}
      </code>
    </div>
  )}

  {/* Date d'analyse */}
  <div className="flex items-center justify-between text-xs text-gray-500">
    <span>Analysé le</span>
    <span>{new Date(result.createdAt).toLocaleString('fr-FR')}</span>
  </div>
</div>
```

#### D. Ajout d'une section explications (optionnel)

**Position**: Après les critères, avant la confiance

```tsx
{/* Explications sur les critères */}
<div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
  <button
    onClick={() => setShowExplanations(!showExplanations)}
    className="w-full flex items-center justify-between text-left"
  >
    <span className="text-sm font-medium text-blue-900">
      📚 Comprendre les critères
    </span>
    <span className="text-blue-600">
      {showExplanations ? '−' : '+'}
    </span>
  </button>

  {showExplanations && (
    <div className="mt-3 space-y-2 text-xs text-blue-800">
      <p><strong>Centrage:</strong> Symétrie des bordures (55/45 = 10/10)</p>
      <p><strong>Coins:</strong> Netteté et absence de dommages</p>
      <p><strong>Bords:</strong> Qualité de la découpe</p>
      <p><strong>Surface:</strong> Rayures, bosses, usure</p>
      <p><strong>Impression:</strong> Qualité d'impression d'usine</p>
    </div>
  )}
</div>
```

### 3.3 Phase 3 - Créer un nouveau composant `GradeCriteriaBar`

**Fichier à créer**: `/apps/web/src/components/mobile/GradeCriteriaBar.tsx`

**Objectif**: Composant réutilisable pour afficher une barre de critère avec paliers

```tsx
'use client';

interface GradeCriteriaBarProps {
  label: string;
  icon: string;
  value: number;
  max?: number;
}

export function GradeCriteriaBar({
  label,
  icon,
  value,
  max = 10
}: GradeCriteriaBarProps) {
  const percentage = (value / max) * 100;

  const getColor = (val: number) => {
    if (val >= 9) return 'from-green-400 to-green-500';
    if (val >= 7) return 'from-blue-400 to-blue-500';
    if (val >= 5) return 'from-orange-400 to-orange-500';
    return 'from-red-400 to-red-500';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-lg font-bold text-gray-900">
          {value.toFixed(1)}/{max}
        </span>
      </div>

      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        {/* Paliers visuels */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: max - 1 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-white border-opacity-30"
            />
          ))}
        </div>

        {/* Barre de progression */}
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getColor(value)} transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

### 3.4 Phase 4 - Créer un composant `MethodBadge`

**Fichier à créer**: `/apps/web/src/components/mobile/MethodBadge.tsx`

```tsx
'use client';

interface MethodBadgeProps {
  method?: string;
  modelVersion?: string;
}

export function MethodBadge({ method, modelVersion }: MethodBadgeProps) {
  if (!method) return null;

  const isRuleBased = method === 'rule_based';

  return (
    <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">
          Méthode d'analyse
        </span>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
            isRuleBased
              ? 'bg-blue-100 text-blue-800'
              : 'bg-purple-100 text-purple-800'
          }`}>
            <span>{isRuleBased ? '📐' : '🤖'}</span>
            {isRuleBased ? 'Règles métier' : 'IA prédictive'}
          </span>
          {modelVersion && (
            <code className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-[10px] font-mono">
              {modelVersion}
            </code>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 3.5 Phase 5 - Mise à jour des exports

**Fichier**: `/apps/web/src/components/mobile/index.ts`

```typescript
export { GradeResultCard } from './GradeResultCard';
export { GradeCriteriaBar } from './GradeCriteriaBar';  // ← NOUVEAU
export { MethodBadge } from './MethodBadge';            // ← NOUVEAU
export { ImageUploader } from './ImageUploader';
export { AnalyzeButton } from './AnalyzeButton';
```

---

## 4. Structure finale du `GradeResultCard` refactorisé

### 4.1 Nouveau composant avec toutes les améliorations

**Fichier**: `/apps/web/src/components/mobile/GradeResultCard.tsx`

**Structure**:
```tsx
<div className="bg-white rounded-2xl shadow-xl overflow-hidden">
  {/* 1. Header avec note finale */}
  <div className={`bg-gradient-to-r ${gradientClass} p-6 text-white`}>
    <div className="text-center">
      <p className="text-6xl font-bold">{finalGrade}</p>
      <p className="text-xl font-semibold">{gradeLabel}</p>
      <p className="text-sm opacity-80">Échelle {scale}</p>
    </div>
  </div>

  {/* 2. Badge méthode */}
  <MethodBadge method={result.method} modelVersion={result.modelVersion} />

  {/* 3. Détails des critères avec nouvelles barres */}
  <div className="p-6">
    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
      Détails par critère
    </h3>
    <div className="space-y-3">
      {criteria.map((criterion) => (
        <GradeCriteriaBar
          key={criterion.label}
          label={criterion.label}
          icon={criterion.icon}
          value={criterion.value}
        />
      ))}
    </div>
  </div>

  {/* 4. Section explications (collapsible) */}
  <ExplanationsSection />

  {/* 5. Section confiance et métadonnées */}
  <div className="px-6 pb-6">
    <div className="pt-6 border-t border-gray-200 space-y-3">
      <ConfidenceBar confidence={result.confidence} />
      <MetadataRow label="Version" value={result.modelVersion} />
      <MetadataRow label="Analysé le" value={formatDate(result.createdAt)} />
    </div>
  </div>
</div>
```

### 4.2 Composants enfants suggérés

**1. `ConfidenceBar.tsx`**: Barre de confiance réutilisable
**2. `MetadataRow.tsx`**: Ligne de métadonnée clé/valeur
**3. `ExplanationsSection.tsx`**: Section collapsible avec explications

---

## 5. Améliorations UI supplémentaires (bonus)

### 5.1 Animations au chargement

**Ajout**: Animations CSS pour les barres qui se remplissent progressivement

```css
/* Dans globals.css */
@keyframes fillBar {
  from { width: 0%; }
  to { width: var(--target-width); }
}

.animate-fill-bar {
  animation: fillBar 1s ease-out forwards;
}
```

### 5.2 Comparaison avec standards

**Ajout**: Tableau comparatif PCA vs PSA

```tsx
<div className="mt-6 p-4 bg-gray-50 rounded-lg">
  <h4 className="text-sm font-medium text-gray-700 mb-2">
    Équivalence des échelles
  </h4>
  <table className="w-full text-xs">
    <thead>
      <tr className="text-gray-600">
        <th className="text-left">Note</th>
        <th className="text-left">PCA</th>
        <th className="text-left">PSA</th>
      </tr>
    </thead>
    <tbody className="text-gray-700">
      <tr>
        <td>10</td>
        <td>Gem Mint</td>
        <td>Gem Mint 10</td>
      </tr>
      <tr>
        <td>9</td>
        <td>Mint</td>
        <td>Mint 9</td>
      </tr>
      {/* etc. */}
    </tbody>
  </table>
</div>
```

### 5.3 Graphique radar (très visuel)

**Bibliothèque**: Utiliser `recharts` pour un graphique radar des 5 critères

```bash
npm install recharts
```

```tsx
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

const data = [
  { criterion: 'Centrage', value: result.centering },
  { criterion: 'Coins', value: result.corners },
  { criterion: 'Bords', value: result.edges },
  { criterion: 'Surface', value: result.surface },
  { criterion: 'Impression', value: result.printQuality },
];

<ResponsiveContainer width="100%" height={200}>
  <RadarChart data={data}>
    <PolarGrid stroke="#e5e7eb" />
    <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11 }} />
    <Radar
      dataKey="value"
      stroke="#3b82f6"
      fill="#3b82f6"
      fillOpacity={0.6}
    />
  </RadarChart>
</ResponsiveContainer>
```

---

## 6. Tests et validation

### 6.1 Cas de test à vérifier

1. **Note parfaite (10/10)**:
   - Tous critères = 10
   - Gradient jaune/or
   - Label "Gem Mint"

2. **Note moyenne (7/10)**:
   - Mix de critères 7-9
   - Gradient cyan
   - Label "Near Mint"

3. **Note faible (4/10)**:
   - Plusieurs critères < 5
   - Gradient rouge
   - Label approprié

4. **Champs optionnels manquants**:
   - Sans `method` → pas de badge
   - Sans `modelVersion` → pas de version affichée
   - Sans `confidence` → section masquée

5. **Responsive**:
   - Mobile (320px - 428px)
   - Tablette (768px+)

### 6.2 Checklist validation

- [ ] TypeScript compile sans erreur
- [ ] Tous les nouveaux champs sont affichés
- [ ] Barres de progression s'animent correctement
- [ ] Badge méthode s'affiche pour "rule_based"
- [ ] Confiance affichée si présente
- [ ] Version du modèle affichée si présente
- [ ] Date formatée correctement en français
- [ ] Responsive sur mobile
- [ ] Aucune régression sur l'affichage existant

---

## 7. Fichiers à créer/modifier

### Fichiers à modifier

1. **`/apps/web/src/lib/types.ts`**
   - Ajouter `method?: string` à `GradeResult`

2. **`/apps/web/src/components/mobile/GradeResultCard.tsx`**
   - Intégrer `MethodBadge`
   - Améliorer les barres de progression
   - Ajouter section métadonnées complète

3. **`/apps/web/src/components/mobile/index.ts`**
   - Exporter les nouveaux composants

### Fichiers à créer

4. **`/apps/web/src/components/mobile/MethodBadge.tsx`**
   - Badge méthode + version

5. **`/apps/web/src/components/mobile/GradeCriteriaBar.tsx`**
   - Barre de critère améliorée avec paliers

6. **`/apps/web/src/components/mobile/ConfidenceBar.tsx`** (optionnel)
   - Barre de confiance réutilisable

7. **`/apps/web/src/components/mobile/ExplanationsSection.tsx`** (optionnel)
   - Section collapsible avec explications

---

## 8. Planning de développement

### Phase 1 - Bases (30 min)
- [ ] Ajouter `method` dans types
- [ ] Créer `MethodBadge.tsx`
- [ ] Intégrer badge dans `GradeResultCard`

### Phase 2 - Améliorations barres (45 min)
- [ ] Créer `GradeCriteriaBar.tsx`
- [ ] Ajouter paliers visuels
- [ ] Ajouter animations

### Phase 3 - Métadonnées (30 min)
- [ ] Améliorer section confiance
- [ ] Afficher version du modèle
- [ ] Formatter date correctement

### Phase 4 - Tests (30 min)
- [ ] Tester tous les cas
- [ ] Vérifier responsive
- [ ] Valider sur mobile réel

**Temps total estimé**: 2h15

---

## 9. Recommandations

### 9.1 Priorités

**P0 (Critique)**:
- Afficher le champ `method` avec badge
- Afficher `modelVersion` en footer
- S'assurer que tous les champs existants fonctionnent

**P1 (Important)**:
- Améliorer les barres de progression avec paliers
- Améliorer la section confiance
- Formatter correctement les dates

**P2 (Nice to have)**:
- Ajouter explications collapsibles
- Ajouter graphique radar
- Ajouter tableau comparatif échelles

### 9.2 Performance

- Utiliser `memo` pour `GradeCriteriaBar` si rendu lent
- Lazy load le graphique radar si ajouté
- Optimiser les animations CSS

### 9.3 Accessibilité

- Ajouter `aria-label` sur les barres de progression
- Assurer contraste couleurs suffisant
- Tester avec lecteur d'écran

### 9.4 i18n futur

- Préparer les labels pour internationalisation
- Séparer les strings dans des constantes
- Utiliser `next-intl` si besoin multi-langues

---

## 10. Résumé

### Ce qui existe déjà ✅
- Composant `GradeResultCard` fonctionnel
- Affichage des 5 critères avec barres
- Note finale avec gradient coloré
- Confiance du modèle

### Ce qui doit être ajouté 🆕
- Badge méthode d'analyse (rule_based vs ml)
- Affichage version du modèle
- Amélioration visuelle des barres (paliers)
- Section métadonnées complète

### Ce qui est optionnel 💡
- Explications des critères (collapsible)
- Graphique radar
- Tableau comparatif échelles
- Animations avancées

**Conclusion**: Le frontend est déjà bien structuré. Les modifications nécessaires sont mineures et consistent principalement à afficher les nouveaux champs `method` et améliorer la présentation visuelle. L'architecture existante est solide et facilite l'ajout de ces nouvelles fonctionnalités.
