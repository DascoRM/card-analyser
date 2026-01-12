# Phase 2+ - Plan d'implémentation des fonctionnalités avancées

**Date**: 2026-01-12
**Agent**: nextjs-expert-agent
**Status**: Plan de recherche complet

---

## Contexte de l'existant

### Architecture actuelle

**Frontend Next.js (`apps/web/`)**
- Next.js 16.1.1 avec App Router
- React 19.2.3
- Tailwind CSS 4
- Architecture mobile-first
- Routes existantes:
  - `/` - Page d'accueil avec QR code
  - `/mobile/[sessionId]` - Upload des photos
  - `/mobile/[sessionId]/results` - Affichage des résultats

**Backend NestJS (`apps/api/`)**
- API REST avec Swagger
- Prisma ORM + PostgreSQL
- Module Sessions avec endpoints CRUD
- Endpoints d'analyse ML existants:
  - `POST /sessions/:id/analyze` - Lance l'analyse
  - `GET /sessions/:id/results` - Récupère les résultats

**ML Service Python (`packages/ml/`)**
- FastAPI + TensorFlow
- Preprocessing OpenCV (card_detector.py, defect_detector.py, image_processor.py)
- Rule-based grader actuel

**Types existants**
```typescript
GradeResult {
  id, sessionId, scale,
  centering, corners, edges, surface, printQuality,
  finalGrade, gradeLabel, confidence, modelVersion, method,
  createdAt
}
```

---

## Fonctionnalité 1: Feedback utilisateur

### Objectif
Permettre à l'utilisateur de corriger les notes proposées par le système pour améliorer le modèle futur.

### User Flow
```
Résultat affiché → Bouton "Corriger les notes" →
Modal/Page d'édition → Ajustement par critère →
Validation → Stockage feedback → Message de confirmation
```

### Frontend (Next.js)

#### 1.1. Nouveaux composants

**`apps/web/src/components/mobile/FeedbackModal.tsx`**
- Modal overlay avec animation
- Liste des 5 critères avec sliders (1-10)
- Affichage comparatif: note ML vs correction utilisateur
- Textarea pour commentaire optionnel
- Boutons "Annuler" / "Valider la correction"

**`apps/web/src/components/mobile/GradeCriteriaSlider.tsx`**
- Slider de 1 à 10 avec labels visuels
- Affichage de la différence avec la note ML
- Couleurs: vert (identique), orange (+/-1), rouge (+/-2+)

**`apps/web/src/components/mobile/FeedbackSuccessMessage.tsx`**
- Message de remerciement
- Indication que le feedback sera utilisé pour améliorer le modèle
- Animation de confirmation

#### 1.2. Modifications de pages existantes

**`apps/web/src/app/mobile/[sessionId]/results/page.tsx`**
- Ajouter bouton "Ces notes ne sont pas correctes ?" après `GradeResultCard`
- Gérer état du modal (ouvert/fermé)
- Gérer soumission du feedback
- Afficher message de succès après validation

#### 1.3. Nouveaux hooks

**`apps/web/src/hooks/useFeedback.ts`**
```typescript
export function useFeedback(sessionId: string, resultId: string) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const submitFeedback = async (feedback: FeedbackDto) => {
    // POST /sessions/:sessionId/results/:resultId/feedback
  }

  return { submitFeedback, isSubmitting, error, success }
}
```

#### 1.4. Nouveaux types

**`apps/web/src/lib/types.ts`** (ajouts)
```typescript
export interface GradeFeedback {
  id: string
  resultId: string
  userId: number
  centering: number
  corners: number
  edges: number
  surface: number
  printQuality: number
  comment?: string
  createdAt: string
}

export interface SubmitFeedbackDto {
  centering: number
  corners: number
  edges: number
  surface: number
  printQuality: number
  comment?: string
}
```

#### 1.5. Nouveaux endpoints API

**`apps/web/src/lib/api.ts`** (ajouts)
```typescript
export async function submitFeedback(
  sessionId: string,
  resultId: string,
  userId: number,
  data: SubmitFeedbackDto
): Promise<GradeFeedback> {
  return fetchApi(`/sessions/${sessionId}/results/${resultId}/feedback?userId=${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
}
```

---

### Backend (NestJS)

#### 1.6. Nouveau module Feedback

**`apps/api/src/feedback/`**
- `feedback.module.ts`
- `feedback.controller.ts`
- `feedback.service.ts`
- `dto/create-feedback.dto.ts`

**Endpoint**
```
POST /sessions/:sessionId/results/:resultId/feedback?userId=X
Body: { centering, corners, edges, surface, printQuality, comment? }
```

#### 1.7. Schema Prisma

**`apps/api/prisma/schema.prisma`** (ajout)
```prisma
model GradeFeedback {
  id            String      @id @default(uuid())
  resultId      String
  result        GradeResult @relation(fields: [resultId], references: [id])
  userId        Int
  user          User        @relation(fields: [userId], references: [id])

  // Corrections proposées par l'utilisateur
  centering     Float
  corners       Float
  edges         Float
  surface       Float
  printQuality  Float

  comment       String?
  createdAt     DateTime    @default(now())

  @@index([resultId])
  @@index([userId])
}
```

#### 1.8. Logique métier

**Validations**
- Vérifier que le résultat existe et appartient à l'utilisateur
- Valider que chaque note est entre 1 et 10
- Limiter la longueur du commentaire (max 500 caractères)

**Stockage**
- Stocker tel quel sans recalculer la note finale
- Associer au résultat et à l'utilisateur
- Horodater avec `createdAt`

**Future ML pipeline**
- Endpoint GET pour export batch des feedbacks
- Utilisé pour réentraînement du modèle

---

### ML (Python)

#### 1.9. Export des feedbacks pour entraînement

**Nouveau script `packages/ml/training/export_feedbacks.py`**
- Récupérer tous les feedbacks depuis la DB
- Formatter en dataset d'entraînement
- Exporter en CSV/JSON pour fine-tuning

**Notes**
- Pas d'intégration immédiate dans le pipeline ML
- Préparation pour Phase 3 (réentraînement automatique)

---

## Fonctionnalité 2: Prix en temps réel

### Objectif
Afficher une estimation du prix de la carte basée sur son identification et son état/grade.

### User Flow
```
Résultat affiché → Section "Estimation de prix" →
Sources externes (TCGdex, Cardmarket, TCGPlayer) →
Affichage fourchette de prix par grade
```

### Frontend (Next.js)

#### 2.1. Nouveaux composants

**`apps/web/src/components/mobile/PriceEstimation.tsx`**
- Card avec titre "Valeur estimée"
- Affichage de la fourchette de prix selon le grade
- Liste des sources (TCGdex, Cardmarket, TCGPlayer)
- Lien vers chaque source
- Disclaimer: "Prix indicatifs, peuvent varier"
- État de chargement pendant la récupération

**`apps/web/src/components/mobile/PriceSourceBadge.tsx`**
- Badge avec logo/nom de la source
- Prix affiché
- Lien externe vers la marketplace

**`apps/web/src/components/mobile/PriceGradeRange.tsx`**
- Tableau comparatif des prix par grade
- Grade actuel mis en évidence
- Grades inférieurs/supérieurs en gris

#### 2.2. Modifications de pages existantes

**`apps/web/src/app/mobile/[sessionId]/results/page.tsx`**
- Ajouter `PriceEstimation` après `GradeResultCard`
- Conditionné à l'identification de la carte (cardName, cardSet)
- Afficher message si carte non identifiée

#### 2.3. Nouveaux hooks

**`apps/web/src/hooks/useCardPrice.ts`**
```typescript
export function useCardPrice(
  cardName?: string,
  cardSet?: string,
  grade?: number
) {
  const [prices, setPrices] = useState<CardPricing | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cardName && cardSet) {
      fetchPrices()
    }
  }, [cardName, cardSet, grade])

  const fetchPrices = async () => {
    // GET /cards/pricing?name=X&set=Y&grade=Z
  }

  return { prices, isLoading, error }
}
```

#### 2.4. Nouveaux types

**`apps/web/src/lib/types.ts`** (ajouts)
```typescript
export interface CardPricing {
  cardName: string
  cardSet: string
  currency: string // EUR, USD
  prices: PriceSource[]
  pricesByGrade?: Record<number, number> // grade -> avg price
  lastUpdated: string
}

export interface PriceSource {
  source: 'tcgdex' | 'cardmarket' | 'tcgplayer'
  price: number
  url?: string
  availability?: string // in_stock, out_of_stock
}
```

#### 2.5. Nouveaux endpoints API

**`apps/web/src/lib/api.ts`** (ajouts)
```typescript
export async function getCardPricing(
  cardName: string,
  cardSet: string,
  grade?: number
): Promise<CardPricing> {
  const params = new URLSearchParams({
    name: cardName,
    set: cardSet,
    ...(grade && { grade: grade.toString() })
  })
  return fetchApi(`/cards/pricing?${params}`)
}
```

---

### Backend (NestJS)

#### 2.6. Nouveau module Cards

**`apps/api/src/cards/`**
- `cards.module.ts`
- `cards.controller.ts`
- `cards.service.ts`
- `dto/card-pricing.dto.ts`
- `providers/tcgdex.provider.ts`
- `providers/cardmarket.provider.ts`
- `providers/tcgplayer.provider.ts`

**Endpoints**
```
GET /cards/pricing?name=X&set=Y&grade=Z
GET /cards/search?query=X (optionnel pour auto-complétion)
```

#### 2.7. Intégrations externes

**TCGdex API (gratuit, pas de clé)**
```typescript
// providers/tcgdex.provider.ts
export class TcgdexProvider {
  private readonly apiUrl = 'https://api.tcgdex.net/v2/en'

  async searchCard(name: string, set: string): Promise<TcgdexCard | null> {
    // GET /sets/{set}/cards?name={name}
  }

  async getCardPricing(cardId: string): Promise<number | null> {
    // API TCGdex ne fournit pas directement les prix
    // Retourner null ou intégrer avec leurs partenaires
  }
}
```

**Cardmarket API (nécessite API key)**
```typescript
// providers/cardmarket.provider.ts
export class CardmarketProvider {
  private readonly apiUrl = 'https://api.cardmarket.com/ws/v2.0'
  private readonly apiKey = process.env.CARDMARKET_API_KEY

  async getCardPrice(productId: number): Promise<number | null> {
    // OAuth 1.0 authentication required
    // GET /products/{productId}/prices
  }

  async searchProducts(query: string): Promise<CardmarketProduct[]> {
    // GET /products?search={query}
  }
}
```

**TCGPlayer API (nécessite API key)**
```typescript
// providers/tcgplayer.provider.ts
export class TcgplayerProvider {
  private readonly apiUrl = 'https://api.tcgplayer.com/v1.39.0'
  private readonly apiKey = process.env.TCGPLAYER_API_KEY

  async getCardPrice(productId: number, condition: string): Promise<number | null> {
    // GET /pricing/product/{productId}
  }

  async searchCards(query: string): Promise<TcgplayerProduct[]> {
    // GET /catalog/products?productName={query}
  }
}
```

#### 2.8. Logique de pricing

**Service principal**
```typescript
// cards.service.ts
export class CardsService {
  async getPricing(
    cardName: string,
    cardSet: string,
    grade?: number
  ): Promise<CardPricing> {
    // 1. Rechercher la carte sur chaque provider en parallèle
    const [tcgdex, cardmarket, tcgplayer] = await Promise.allSettled([
      this.tcgdexProvider.searchCard(cardName, cardSet),
      this.cardmarketProvider.searchProducts(`${cardName} ${cardSet}`),
      this.tcgplayerProvider.searchCards(`${cardName} ${cardSet}`)
    ])

    // 2. Récupérer les prix pour chaque source
    // 3. Calculer la fourchette par grade (approximation)
    // 4. Retourner l'agrégation
  }
}
```

#### 2.9. Cache et rate limiting

**Cache Redis (optionnel)**
- Cache des résultats de pricing pendant 1 heure
- Clé: `pricing:{cardName}:{cardSet}:{grade}`
- Éviter les appels répétés aux APIs externes

**Rate limiting**
- Limiter les appels utilisateur: 10 requêtes/minute
- Limiter les appels aux APIs tierces selon leurs quotas

#### 2.10. Variables d'environnement

**`apps/api/.env`** (ajouts)
```
CARDMARKET_API_KEY=xxx
CARDMARKET_API_SECRET=xxx
TCGPLAYER_API_KEY=xxx
TCGPLAYER_PUBLIC_KEY=xxx
TCGPLAYER_PRIVATE_KEY=xxx
REDIS_URL=redis://localhost:6379 # optionnel pour cache
```

---

### ML (Python)

Pas d'impact direct sur le service ML pour cette fonctionnalité.

---

## Fonctionnalité 3: Reconnaissance de carte

### Objectif
Identifier automatiquement la carte photographiée (nom, set, numéro) via OCR et reconnaissance visuelle.

### User Flow
```
Upload photo → Analyse OCR + reconnaissance visuelle →
Pré-remplissage (cardName, cardSet, cardYear) →
Utilisateur peut corriger si nécessaire →
Stockage dans session
```

### Frontend (Next.js)

#### 3.1. Nouveaux composants

**`apps/web/src/components/mobile/CardIdentificationBanner.tsx`**
- Banner affiché après upload des photos
- "Carte détectée: [Nom] - [Set] ([Année])"
- Bouton "Modifier" pour correction manuelle
- Icône de confiance (🎯 haute, ⚠️ moyenne, ❌ faible)

**`apps/web/src/components/mobile/CardInfoEditor.tsx`**
- Modal d'édition des infos carte
- Champs: cardName, cardSet, cardYear, cardType
- Auto-complétion basée sur API TCGdex
- Boutons "Annuler" / "Enregistrer"

**`apps/web/src/components/mobile/CardAutoCompleteInput.tsx`**
- Input avec suggestions en temps réel
- Dropdown des résultats de recherche
- Affichage miniature + infos carte

#### 3.2. Modifications de pages existantes

**`apps/web/src/app/mobile/[sessionId]/page.tsx`**
- Après upload des 2 images, déclencher l'identification
- Afficher `CardIdentificationBanner` si identification réussie
- Permettre édition avant l'analyse ML

#### 3.3. Nouveaux hooks

**`apps/web/src/hooks/useCardIdentification.ts`**
```typescript
export function useCardIdentification(sessionId: string) {
  const [identification, setIdentification] = useState<CardIdentification | null>(null)
  const [isIdentifying, setIsIdentifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const identifyCard = async () => {
    // POST /sessions/:sessionId/identify
  }

  const updateCardInfo = async (info: UpdateCardInfoDto) => {
    // PATCH /sessions/:sessionId
  }

  return { identification, isIdentifying, identifyCard, updateCardInfo, error }
}
```

#### 3.4. Nouveaux types

**`apps/web/src/lib/types.ts`** (ajouts)
```typescript
export interface CardIdentification {
  cardName: string
  cardSet?: string
  cardYear?: number
  cardType?: string
  cardNumber?: string
  confidence: number // 0-1
  method: 'ocr' | 'visual' | 'hybrid'
  extractedText?: string[]
}

export interface UpdateCardInfoDto {
  cardName?: string
  cardSet?: string
  cardYear?: number
  cardType?: string
}
```

#### 3.5. Nouveaux endpoints API

**`apps/web/src/lib/api.ts`** (ajouts)
```typescript
export async function identifyCard(
  sessionId: string,
  userId: number
): Promise<CardIdentification> {
  return fetchApi(`/sessions/${sessionId}/identify?userId=${userId}`, {
    method: 'POST'
  })
}

export async function searchCards(query: string): Promise<CardSearchResult[]> {
  return fetchApi(`/cards/search?query=${query}`)
}
```

---

### Backend (NestJS)

#### 3.6. Modifications du module Sessions

**`apps/api/src/sessions/sessions.controller.ts`** (ajout)
```typescript
@Post(':id/identify')
@ApiOperation({ summary: 'Identifier la carte automatiquement' })
async identifyCard(
  @Param('id', ParseUUIDPipe) id: string,
  @Query('userId', ParseIntPipe) userId: number
) {
  return this.sessionsService.identifyCard(id, userId)
}
```

**`apps/api/src/sessions/sessions.service.ts`** (ajout)
```typescript
async identifyCard(sessionId: string, userId: number): Promise<CardIdentification> {
  // 1. Récupérer la session et les images
  // 2. Appeler le service ML pour OCR + reconnaissance
  // 3. Mettre à jour la session avec les infos détectées
  // 4. Retourner les résultats
}
```

#### 3.7. Intégration service ML

**Communication avec ML service**
```typescript
// ml/ml.service.ts (ajout)
async identifyCard(imagePaths: string[]): Promise<MLCardIdentification> {
  const response = await this.httpService.axiosRef.post(
    `${this.mlServiceUrl}/identify`,
    { images: imagePaths },
    { headers: { 'X-API-Key': this.apiKey } }
  )
  return response.data
}
```

#### 3.8. Module Cards (extension)

**`apps/api/src/cards/cards.controller.ts`** (ajout)
```typescript
@Get('search')
@ApiOperation({ summary: 'Rechercher des cartes pour auto-complétion' })
async search(@Query('query') query: string) {
  return this.cardsService.searchCards(query)
}
```

**`apps/api/src/cards/cards.service.ts`** (ajout)
```typescript
async searchCards(query: string): Promise<CardSearchResult[]> {
  // Utiliser TCGdex API pour recherche rapide
  return this.tcgdexProvider.searchCards(query)
}
```

---

### ML (Python)

#### 3.9. Nouveau endpoint d'identification

**`packages/ml/main.py`** (ajout)
```python
@app.post("/identify")
async def identify_card(data: IdentifyCardRequest):
    """
    Identifier une carte via OCR et reconnaissance visuelle.

    Args:
        images: Liste de chemins d'images (front, back)

    Returns:
        CardIdentification avec nom, set, année, confiance
    """
    # 1. Appliquer OCR sur l'image front
    # 2. Extraire le texte (nom, set, numéro)
    # 3. (Optionnel) Reconnaissance visuelle CLIP
    # 4. Retourner les résultats
```

#### 3.10. OCR avec Tesseract

**`packages/ml/inference/ocr.py`** (nouveau)
```python
import pytesseract
from PIL import Image
import re

class CardOCR:
    """OCR pour extraire le texte des cartes."""

    def __init__(self):
        self.patterns = {
            'card_name': r'^[A-Z][a-z]+(?:\s[A-Z][a-z]+)*',
            'card_number': r'(\d{1,3})/(\d{1,3})',
            'set_code': r'[A-Z]{2,4}(?:-[A-Z]{2,4})?'
        }

    def extract_text(self, image_path: str) -> dict:
        """Extraire le texte d'une image."""
        image = Image.open(image_path)

        # Preprocessing pour améliorer l'OCR
        image = self._preprocess(image)

        # OCR avec Tesseract
        text = pytesseract.image_to_string(image, lang='eng')

        # Parser le texte
        return self._parse_card_info(text)

    def _parse_card_info(self, text: str) -> dict:
        """Parser les infos de carte depuis le texte."""
        lines = text.strip().split('\n')

        info = {
            'name': None,
            'number': None,
            'set': None,
            'year': None,
            'raw_text': text
        }

        # Extraction avec regex
        for line in lines:
            # Nom (généralement première ligne)
            if not info['name'] and re.match(self.patterns['card_name'], line):
                info['name'] = line.strip()

            # Numéro de carte (ex: 025/102)
            number_match = re.search(self.patterns['card_number'], line)
            if number_match:
                info['number'] = f"{number_match.group(1)}/{number_match.group(2)}"

        return info
```

#### 3.11. Reconnaissance visuelle CLIP (optionnel, Phase 3)

**`packages/ml/inference/visual_recognition.py`** (nouveau)
```python
# Utiliser CLIP ou modèle similaire pour reconnaissance visuelle
# Nécessite dataset de cartes étiquetées
# Complexité élevée, à réserver pour Phase 3

class VisualRecognizer:
    """Reconnaissance visuelle de cartes avec CLIP."""

    def __init__(self, model_path: str):
        # Charger le modèle CLIP fine-tuné
        pass

    async def identify(self, image_path: str) -> dict:
        """Identifier la carte visuellement."""
        # Embedding de l'image
        # Comparaison avec base de données de cartes
        # Retour des top-k matchs
        pass
```

#### 3.12. Dépendances Python

**`packages/ml/requirements.txt`** (ajouts)
```
pytesseract==0.3.10
pillow>=10.0.0
```

**Installation Tesseract**
```bash
# macOS
brew install tesseract

# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# Windows
# Télécharger depuis https://github.com/UB-Mannheim/tesseract/wiki
```

---

## Ordre d'implémentation recommandé

### Phase 2A - Feedback utilisateur (Priorité 1)
**Justification**: Permet de collecter des données dès maintenant pour améliorer le modèle ML futur.

**Ordre**:
1. Backend: Schema Prisma + migration
2. Backend: Module Feedback (controller, service, DTO)
3. Frontend: Composants UI (modal, sliders)
4. Frontend: Hook useFeedback
5. Frontend: Intégration dans page results
6. Tests E2E du flux complet

**Durée estimée**: 2-3 jours

---

### Phase 2B - Reconnaissance de carte (Priorité 2)
**Justification**: Prérequis pour le pricing. Améliore l'UX en évitant la saisie manuelle.

**Ordre**:
1. ML: Installer Tesseract + dépendances
2. ML: Implémenter CardOCR avec extraction de texte
3. ML: Endpoint POST /identify
4. Backend: Intégrer appel ML dans SessionsService
5. Backend: Endpoint POST /sessions/:id/identify
6. Backend: Module Cards avec recherche TCGdex
7. Frontend: Composants UI (banner, éditeur)
8. Frontend: Hook useCardIdentification
9. Frontend: Intégration dans page upload
10. Tests avec vraies cartes Pokémon

**Durée estimée**: 4-5 jours

---

### Phase 2C - Prix en temps réel (Priorité 3)
**Justification**: Dépend de l'identification de la carte. Feature "nice-to-have" mais moins critique.

**Ordre**:
1. Backend: Créer comptes développeur APIs externes (Cardmarket, TCGPlayer)
2. Backend: Module Cards avec providers (TCGdex, Cardmarket, TCGPlayer)
3. Backend: Endpoint GET /cards/pricing
4. Backend: Implémenter cache Redis (optionnel)
5. Backend: Rate limiting
6. Frontend: Composants UI (PriceEstimation, badges)
7. Frontend: Hook useCardPrice
8. Frontend: Intégration dans page results
9. Tests avec cartes réelles

**Durée estimée**: 5-6 jours

**Attention**: Les APIs externes peuvent nécessiter validation de compte (délai administratif).

---

## Besoins transversaux

### Backend (NestJS)

#### Nouveaux modules
- `apps/api/src/feedback/` (Feedback utilisateur)
- `apps/api/src/cards/` (Pricing + Reconnaissance)

#### Modifications modules existants
- `apps/api/src/sessions/` (ajout endpoints identify)
- `apps/api/src/ml/` (ajout appel identify)

#### Nouvelles dépendances
```json
{
  "@nestjs/throttler": "^5.0.0", // Rate limiting
  "ioredis": "^5.3.0", // Cache Redis (optionnel)
  "axios": "^1.6.0" // Déjà présent
}
```

#### Schema Prisma
- Ajouter model `GradeFeedback`
- Relation avec `GradeResult` et `User`
- Migration: `npx prisma migrate dev --name add-grade-feedback`

#### Variables d'environnement
```env
# APIs externes
CARDMARKET_API_KEY=xxx
CARDMARKET_API_SECRET=xxx
TCGPLAYER_API_KEY=xxx
TCGPLAYER_PUBLIC_KEY=xxx
TCGPLAYER_PRIVATE_KEY=xxx

# Cache (optionnel)
REDIS_URL=redis://localhost:6379
REDIS_TTL=3600

# Rate limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

---

### Frontend (Next.js)

#### Nouveaux composants
- `FeedbackModal.tsx` (Phase 2A)
- `GradeCriteriaSlider.tsx` (Phase 2A)
- `FeedbackSuccessMessage.tsx` (Phase 2A)
- `CardIdentificationBanner.tsx` (Phase 2B)
- `CardInfoEditor.tsx` (Phase 2B)
- `CardAutoCompleteInput.tsx` (Phase 2B)
- `PriceEstimation.tsx` (Phase 2C)
- `PriceSourceBadge.tsx` (Phase 2C)
- `PriceGradeRange.tsx` (Phase 2C)

#### Nouveaux hooks
- `useFeedback.ts` (Phase 2A)
- `useCardIdentification.ts` (Phase 2B)
- `useCardPrice.ts` (Phase 2C)

#### Modifications pages existantes
- `/mobile/[sessionId]/page.tsx` (Phase 2B - identification)
- `/mobile/[sessionId]/results/page.tsx` (Phase 2A - feedback, Phase 2C - pricing)

#### Extensions types
- `GradeFeedback` (Phase 2A)
- `SubmitFeedbackDto` (Phase 2A)
- `CardIdentification` (Phase 2B)
- `UpdateCardInfoDto` (Phase 2B)
- `CardPricing` (Phase 2C)
- `PriceSource` (Phase 2C)

#### Extensions API client
- `submitFeedback()` (Phase 2A)
- `identifyCard()` (Phase 2B)
- `searchCards()` (Phase 2B)
- `getCardPricing()` (Phase 2C)

#### Nouvelles dépendances
```json
{
  "framer-motion": "^11.0.0" // Animations modals (optionnel)
}
```

---

### ML (Python)

#### Nouveaux modules
- `packages/ml/inference/ocr.py` (Phase 2B)
- `packages/ml/inference/visual_recognition.py` (Phase 3, optionnel)
- `packages/ml/training/export_feedbacks.py` (Phase 3)

#### Nouveau endpoint
- `POST /identify` (Phase 2B)

#### Nouvelles dépendances
```txt
pytesseract==0.3.10
pillow>=10.0.0
# CLIP pour Phase 3 (optionnel)
transformers>=4.35.0
torch>=2.1.0
```

#### Installation système
- Tesseract OCR (voir instructions par OS)

---

## Architecture des données

### Modèle relationnel

```
Session
  ├─ images[] (SessionImage)
  ├─ gradeResults[] (GradeResult)
  │    └─ feedbacks[] (GradeFeedback) ← NOUVEAU
  └─ cardName, cardSet, cardYear ← Alimenté par identification

User
  └─ feedbacks[] (GradeFeedback)
```

### Flux de données Phase 2

```
1. Upload → Identification ML → Session.cardName/cardSet/cardYear
2. Analyse → GradeResult
3. Affichage → Pricing API (si carte identifiée)
4. Correction → GradeFeedback stocké
```

---

## Considérations techniques

### Performance
- **Cache**: Implémenter Redis pour les pricing requests (TTL 1h)
- **Rate limiting**: Protéger les endpoints externes (10 req/min/user)
- **Lazy loading**: Ne charger le pricing que si carte identifiée

### Sécurité
- **Validation**: Toutes les entrées utilisateur (notes 1-10, longueur commentaires)
- **API Keys**: Stockées dans .env, jamais exposées côté client
- **Rate limiting**: Éviter abus des APIs externes gratuites

### UX
- **Mobile-first**: Tous les composants responsive
- **Animations**: Feedback visuel (loading, success, error)
- **Offline**: Gérer gracefully l'indisponibilité des APIs externes
- **Disclaimers**: Prix indicatifs, peuvent varier

### Scalabilité
- **APIs externes**: Quotas (TCGPlayer: 300 req/jour gratuit)
- **Cache**: Mutualiser les résultats entre utilisateurs
- **Batch processing**: Export feedbacks par batch pour ML

---

## Tests à prévoir

### Frontend
- Composants React (Jest + RTL)
- Hooks (useFeedback, useCardIdentification, useCardPrice)
- E2E (Playwright): flux complet upload → feedback

### Backend
- Unit tests: Services (FeedbackService, CardsService)
- Integration tests: Endpoints API
- E2E: Flux complet avec ML mock

### ML
- Unit tests: OCR extraction (avec images de test)
- Integration tests: Endpoint /identify

---

## Risques et dépendances

### APIs externes
**Risque**: Quotas limités, latence, disponibilité
**Mitigation**: Cache, fallback, rate limiting, gestion d'erreur gracieuse

### OCR qualité
**Risque**: Faible précision selon qualité photo
**Mitigation**:
- Afficher niveau de confiance
- Permettre correction manuelle
- Guider l'utilisateur (bonne luminosité, angle droit)

### Temps d'implémentation
**Risque**: Sous-estimation de la complexité des intégrations externes
**Mitigation**: Implémenter par phase, mock APIs pour tests

---

## Documentation à créer

### Technique
1. Guide d'intégration APIs externes (Cardmarket, TCGPlayer)
2. Architecture du module Feedback
3. Architecture du module Cards
4. Guide OCR et preprocessing

### Utilisateur
1. Comment corriger les notes
2. Comprendre l'estimation de prix
3. Améliorer la qualité des photos pour l'identification

---

## Conclusion

Ce plan couvre les 3 fonctionnalités de Phase 2+ avec une approche pragmatique et incrémentale:

1. **Feedback utilisateur** (2-3j) - Immédiat, fort ROI pour ML futur
2. **Reconnaissance de carte** (4-5j) - Fondation pour pricing, améliore UX
3. **Prix en temps réel** (5-6j) - Feature premium, dépend de Phase 2B

**Durée totale estimée**: 11-14 jours de développement

**Prérequis**:
- Comptes développeur APIs externes (1-2 jours validation)
- Tesseract OCR installé
- Redis (optionnel, mais recommandé)

Le plan respecte l'architecture existante, suit les bonnes pratiques Next.js/NestJS, et maintient la règle métier clé: toute logique de notation reste côté backend.
