# Phase 2B & 2C - Plan d'implémentation Backend

**Date**: 2026-01-12
**Agent**: nestjs-expert-agent
**Status**: Plan de recherche détaillé

---

## Contexte

Le projet Card Grading dispose actuellement de:
- **Backend NestJS** avec Prisma ORM + PostgreSQL
- **Module Sessions** pour gérer les sessions d'analyse
- **Module ML** pour communiquer avec le service Python
- **Module Feedback** pour collecter les corrections utilisateurs (Phase 2A déjà implémentée)

### Objectifs Phase 2B & 2C

**Phase 2B - Reconnaissance de carte (OCR)**
- Identifier automatiquement la carte (nom, set, numéro) via OCR
- Matcher avec une base de données Pokémon externe
- Stocker les métadonnées de la carte dans la session

**Phase 2C - Prix en temps réel**
- Afficher une estimation de prix selon le grade obtenu
- Intégrer plusieurs APIs de pricing
- Gérer le cache pour optimiser les performances

---

## Architecture proposée

```
┌─────────────────────────────────────────────────────────────┐
│                      NestJS Backend                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Sessions Module │  │    Cards Module  │               │
│  │                  │  │                  │               │
│  │ - identifyCard() │──▶ - identifyCard() │               │
│  │ - analyze()      │  │ - searchCards()  │               │
│  │                  │  │ - getPricing()   │               │
│  └────────┬─────────┘  └────────┬─────────┘               │
│           │                     │                          │
│           │                     │                          │
│  ┌────────▼─────────┐  ┌────────▼─────────────────────┐   │
│  │   ML Service     │  │  External API Providers      │   │
│  │                  │  │                              │   │
│  │ - OCR (Tess.)    │  │ - PokémonTCG API (gratuit)  │   │
│  │ - Preprocess     │  │ - TCGdex (gratuit)          │   │
│  └──────────────────┘  │ - TCGPlayer (pricing)       │   │
│                        │ - CardMarket (pricing)       │   │
│                        └──────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Cache Layer (Redis)                     │  │
│  │  - Card metadata cache (TTL: 7 jours)               │  │
│  │  - Pricing cache (TTL: 1 heure)                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 2B - Reconnaissance de carte (OCR)

### 1. APIs externes recommandées

#### 1.1. API d'identification de cartes

**Option 1: PokémonTCG API** (RECOMMANDÉ)
- **URL**: https://api.pokemontcg.io/v2
- **Prix**: Gratuit (1000 requêtes/heure sans clé, illimité avec clé gratuite)
- **Avantages**:
  - Base de données complète de toutes les cartes Pokémon
  - Métadonnées riches (set, numéro, rareté, artiste, etc.)
  - Recherche par nom, set, numéro
  - Images haute résolution disponibles
  - Documentation excellente
- **Inconvénients**:
  - Ne fournit pas de prix directement
  - Requiert un matching textuel après OCR

**Exemple requête**:
```bash
GET https://api.pokemontcg.io/v2/cards?q=name:"Charizard" set.name:"Base Set"
```

**Option 2: TCGdex API** (Alternative)
- **URL**: https://api.tcgdex.net/v2/en
- **Prix**: Gratuit, pas de clé requise
- **Avantages**:
  - API simple et rapide
  - Multilingue
  - Base de données à jour
- **Inconvénients**:
  - Base de données moins complète que PokémonTCG API
  - Pas de pricing intégré

**Recommandation**: **PokémonTCG API** comme source principale, **TCGdex** comme fallback.

#### 1.2. Solution OCR

**Option 1: Tesseract OCR** (RECOMMANDÉ pour MVP)
- **Installation**: Locale, open-source
- **Prix**: Gratuit
- **Avantages**:
  - Pas de limite d'appels
  - Pas de coût
  - Bonne performance sur texte imprimé (cartes)
  - Intégration Python simple
- **Inconvénients**:
  - Qualité dépend du preprocessing
  - Moins performant que solutions cloud sur texte stylisé

**Option 2: Google Cloud Vision API** (Pour Phase 3)
- **Prix**: 1,50$ / 1000 images (après 1000 gratuits/mois)
- **Avantages**:
  - Excellente précision
  - Détection de layout avancée
- **Inconvénients**:
  - Coût
  - Dépendance externe

**Option 3: AWS Textract**
- **Prix**: 1,50$ / 1000 pages
- **Avantages**: Extraction de tables et formulaires
- **Inconvénients**: Overkill pour notre cas d'usage

**Recommandation**: **Tesseract OCR** pour MVP, migration vers **Google Vision** si besoin de meilleure précision.

---

### 2. Workflow d'identification

```
1. User uploads images (front + back)
   ↓
2. POST /sessions/:id/identify
   ↓
3. SessionsService.identifyCard()
   ↓
4. MlService.extractCardInfo()
   → Appelle ML service Python
   → OCR Tesseract sur image front
   → Extraction: nom, set, numéro
   ↓
5. CardsService.matchCard()
   → Recherche sur PokémonTCG API
   → Matching fuzzy sur nom + set
   → Récupération métadonnées complètes
   ↓
6. Mise à jour Session avec cardName, cardSet, cardYear, etc.
   ↓
7. Retour CardIdentification au client
```

---

### 3. Modifications Prisma Schema

**Aucune modification requise!** Le schema actuel contient déjà les champs nécessaires:

```prisma
model Session {
  id          String        @id @default(uuid())
  userId      Int

  // ✅ Ces champs existent déjà
  cardName    String?
  cardSet     String?
  cardYear    Int?
  cardType    String?

  // On pourrait ajouter (optionnel):
  cardNumber  String?      // Ex: "025/102"
  cardRarity  String?      // Ex: "Rare Holo"
  cardArtist  String?      // Nom de l'artiste

  // Métadonnées d'identification
  identificationConfidence Float?   // 0-1
  identificationMethod     String?  // "ocr", "manual"
  pokemonTcgApiId         String?  // ID de la carte sur PokémonTCG API

  status      SessionStatus @default(PENDING)
  images      SessionImage[]
  gradeResults GradeResult[]

  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  completedAt DateTime?
}
```

**Migration suggérée**:
```prisma
// Migration: add_card_identification_fields
model Session {
  // ... existing fields

  cardNumber               String?
  cardRarity               String?
  cardArtist               String?
  identificationConfidence Float?
  identificationMethod     String?
  pokemonTcgApiId          String?
}
```

---

### 4. Nouveau Module: Cards

#### 4.1. Structure du module

```
apps/api/src/cards/
├── cards.module.ts
├── cards.controller.ts
├── cards.service.ts
├── dto/
│   ├── card-identification.dto.ts
│   ├── card-search.dto.ts
│   ├── card-pricing.dto.ts
│   └── index.ts
├── interfaces/
│   ├── card-metadata.interface.ts
│   ├── pokemon-tcg-api.interface.ts
│   ├── pricing-provider.interface.ts
│   └── index.ts
├── providers/
│   ├── pokemon-tcg.provider.ts
│   ├── tcgdex.provider.ts
│   ├── tcgplayer-pricing.provider.ts
│   ├── cardmarket-pricing.provider.ts
│   └── index.ts
├── exceptions/
│   ├── card-not-found.exception.ts
│   ├── pricing-unavailable.exception.ts
│   └── index.ts
└── index.ts
```

#### 4.2. Endpoints

```typescript
// cards.controller.ts

@Controller('cards')
@ApiTags('Cards')
export class CardsController {

  // Recherche de cartes (pour auto-complétion)
  @Get('search')
  @ApiOperation({ summary: 'Search Pokémon cards' })
  async searchCards(
    @Query('query') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<CardSearchResultDto[]> {}

  // Récupérer les détails d'une carte
  @Get(':id')
  @ApiOperation({ summary: 'Get card details by ID' })
  async getCard(
    @Param('id') id: string
  ): Promise<CardMetadataDto> {}

  // Pricing d'une carte
  @Get('pricing')
  @ApiOperation({ summary: 'Get card pricing across multiple sources' })
  async getCardPricing(
    @Query('name') cardName: string,
    @Query('set') cardSet: string,
    @Query('grade', new DefaultValuePipe(10), ParseIntPipe) grade?: number,
  ): Promise<CardPricingDto> {}

  // Matcher une carte depuis texte OCR
  @Post('match')
  @ApiOperation({ summary: 'Match a card from OCR text' })
  async matchCard(
    @Body() matchCardDto: MatchCardDto
  ): Promise<CardMetadataDto> {}
}
```

#### 4.3. DTOs

**card-identification.dto.ts**
```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CardIdentificationDto {
  @ApiProperty()
  cardName: string;

  @ApiProperty({ required: false })
  cardSet?: string;

  @ApiProperty({ required: false })
  cardYear?: number;

  @ApiProperty({ required: false })
  cardNumber?: string;

  @ApiProperty({ required: false })
  cardType?: string;

  @ApiProperty({ description: 'Confidence score 0-1' })
  confidence: number;

  @ApiProperty({ enum: ['ocr', 'manual', 'api'] })
  method: string;

  @ApiProperty({ required: false })
  extractedText?: string[];

  @ApiProperty({ required: false, description: 'PokémonTCG API card ID' })
  apiId?: string;
}

export class MatchCardDto {
  @ApiProperty({ description: 'Extracted text from OCR' })
  extractedText: string[];

  @ApiProperty({ required: false })
  cardName?: string;

  @ApiProperty({ required: false })
  cardSet?: string;
}
```

**card-search.dto.ts**
```typescript
export class CardSearchResultDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  set: string;

  @ApiProperty({ required: false })
  number?: string;

  @ApiProperty({ required: false })
  rarity?: string;

  @ApiProperty({ required: false })
  imageUrl?: string;

  @ApiProperty({ required: false })
  releaseDate?: string;
}

export class CardMetadataDto extends CardSearchResultDto {
  @ApiProperty({ required: false })
  artist?: string;

  @ApiProperty({ required: false })
  hp?: string;

  @ApiProperty({ required: false })
  types?: string[];

  @ApiProperty({ required: false })
  supertype?: string;

  @ApiProperty({ required: false })
  subtypes?: string[];
}
```

#### 4.4. Services

**cards.service.ts**
```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PokemonTcgProvider } from './providers/pokemon-tcg.provider';
import { TcgdexProvider } from './providers/tcgdex.provider';
import { MatchCardDto, CardMetadataDto, CardSearchResultDto } from './dto';

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);

  constructor(
    private readonly pokemonTcgProvider: PokemonTcgProvider,
    private readonly tcgdexProvider: TcgdexProvider,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Search cards by query string
   */
  async searchCards(query: string, limit = 10): Promise<CardSearchResultDto[]> {
    this.logger.log(`Searching cards with query: ${query}`);

    try {
      return await this.pokemonTcgProvider.searchCards(query, limit);
    } catch (error) {
      this.logger.warn(`PokemonTCG API failed, trying TCGdex: ${error.message}`);
      return await this.tcgdexProvider.searchCards(query, limit);
    }
  }

  /**
   * Get card details by ID
   */
  async getCardById(id: string): Promise<CardMetadataDto> {
    try {
      return await this.pokemonTcgProvider.getCard(id);
    } catch (error) {
      throw new NotFoundException(`Card with ID ${id} not found`);
    }
  }

  /**
   * Match a card from OCR extracted text
   * Uses fuzzy matching algorithm
   */
  async matchCard(matchDto: MatchCardDto): Promise<CardMetadataDto> {
    const { extractedText, cardName, cardSet } = matchDto;

    // Strategy 1: If cardName provided, use it directly
    if (cardName) {
      const query = cardSet ? `name:"${cardName}" set.name:"${cardSet}"` : `name:"${cardName}"`;
      const results = await this.pokemonTcgProvider.searchCards(query, 1);

      if (results.length > 0) {
        return this.pokemonTcgProvider.getCard(results[0].id);
      }
    }

    // Strategy 2: Parse extracted text
    const parsedInfo = this.parseExtractedText(extractedText);

    if (parsedInfo.name) {
      const query = parsedInfo.set
        ? `name:"${parsedInfo.name}" set.name:"${parsedInfo.set}"`
        : `name:"${parsedInfo.name}"`;

      const results = await this.pokemonTcgProvider.searchCards(query, 5);

      if (results.length > 0) {
        // Apply fuzzy matching to find best match
        const bestMatch = this.findBestMatch(parsedInfo, results);
        return this.pokemonTcgProvider.getCard(bestMatch.id);
      }
    }

    throw new NotFoundException('Unable to match card from provided information');
  }

  /**
   * Parse extracted text to identify card information
   */
  private parseExtractedText(lines: string[]): {
    name?: string;
    set?: string;
    number?: string;
  } {
    // Card name is typically the first line (largest text)
    const name = lines[0]?.trim();

    // Look for card number pattern (e.g., "025/102")
    const numberPattern = /(\d{1,3})\/(\d{1,3})/;
    const numberLine = lines.find(line => numberPattern.test(line));
    const numberMatch = numberLine?.match(numberPattern);
    const number = numberMatch ? `${numberMatch[1]}/${numberMatch[2]}` : undefined;

    // Set identification is harder, often requires set symbol recognition
    // For now, we'll rely on the API search

    return { name, number };
  }

  /**
   * Find best matching card using similarity score
   */
  private findBestMatch(
    parsed: { name?: string; number?: string },
    candidates: CardSearchResultDto[]
  ): CardSearchResultDto {
    // Simple scoring: exact name match > partial name match
    // If we have a number, prioritize exact number match

    let bestScore = 0;
    let bestMatch = candidates[0];

    for (const candidate of candidates) {
      let score = 0;

      // Name similarity (simple contains check)
      if (parsed.name && candidate.name.toLowerCase().includes(parsed.name.toLowerCase())) {
        score += 10;
      }

      // Exact name match
      if (parsed.name && candidate.name.toLowerCase() === parsed.name.toLowerCase()) {
        score += 50;
      }

      // Number match
      if (parsed.number && candidate.number === parsed.number) {
        score += 100;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    return bestMatch;
  }
}
```

**providers/pokemon-tcg.provider.ts**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CardSearchResultDto, CardMetadataDto } from '../dto';

interface PokemonTCGCard {
  id: string;
  name: string;
  set: {
    name: string;
    releaseDate: string;
  };
  number: string;
  rarity?: string;
  images: {
    small: string;
    large: string;
  };
  artist?: string;
  hp?: string;
  types?: string[];
  supertype?: string;
  subtypes?: string[];
}

@Injectable()
export class PokemonTcgProvider {
  private readonly logger = new Logger(PokemonTcgProvider.name);
  private readonly apiUrl = 'https://api.pokemontcg.io/v2';
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('POKEMON_TCG_API_KEY', '');
  }

  async searchCards(query: string, limit = 10): Promise<CardSearchResultDto[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ data: PokemonTCGCard[] }>(
          `${this.apiUrl}/cards`,
          {
            params: { q: query, pageSize: limit },
            headers: this.apiKey ? { 'X-Api-Key': this.apiKey } : {},
          }
        )
      );

      return response.data.data.map(card => this.mapToSearchResult(card));
    } catch (error) {
      this.logger.error(`Failed to search cards: ${error.message}`);
      throw error;
    }
  }

  async getCard(id: string): Promise<CardMetadataDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ data: PokemonTCGCard }>(
          `${this.apiUrl}/cards/${id}`,
          {
            headers: this.apiKey ? { 'X-Api-Key': this.apiKey } : {},
          }
        )
      );

      return this.mapToMetadata(response.data.data);
    } catch (error) {
      this.logger.error(`Failed to get card ${id}: ${error.message}`);
      throw error;
    }
  }

  private mapToSearchResult(card: PokemonTCGCard): CardSearchResultDto {
    return {
      id: card.id,
      name: card.name,
      set: card.set.name,
      number: card.number,
      rarity: card.rarity,
      imageUrl: card.images.small,
      releaseDate: card.set.releaseDate,
    };
  }

  private mapToMetadata(card: PokemonTCGCard): CardMetadataDto {
    return {
      ...this.mapToSearchResult(card),
      artist: card.artist,
      hp: card.hp,
      types: card.types,
      supertype: card.supertype,
      subtypes: card.subtypes,
    };
  }
}
```

#### 4.5. Intégration avec SessionsService

**sessions.service.ts (ajout)**
```typescript
import { CardsService } from '../cards';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mlService: MlService,
    private readonly cardsService: CardsService, // ← Injection
  ) {}

  /**
   * Identify card from uploaded images using OCR + API matching
   */
  async identifyCard(
    sessionId: string,
    userId: number,
  ): Promise<CardIdentificationDto> {
    await this.validateUserOwnership(sessionId, userId);

    // Get session images
    const images = await this.prisma.sessionImage.findMany({
      where: { sessionId },
    });

    const frontImage = images.find(img => img.side === CardSide.FRONT);

    if (!frontImage) {
      throw new BadRequestException('No front image found for OCR');
    }

    // Call ML service to extract text via OCR
    const ocrResult = await this.mlService.extractCardInfo(frontImage.url);

    this.logger.log(
      `OCR extracted text for session ${sessionId}: ${JSON.stringify(ocrResult.extractedText)}`
    );

    // Match card using extracted text
    try {
      const matchedCard = await this.cardsService.matchCard({
        extractedText: ocrResult.extractedText,
        cardName: ocrResult.cardName,
      });

      // Update session with matched card info
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          cardName: matchedCard.name,
          cardSet: matchedCard.set,
          cardYear: this.parseYear(matchedCard.releaseDate),
          cardNumber: matchedCard.number,
          cardRarity: matchedCard.rarity,
          cardArtist: matchedCard.artist,
          identificationConfidence: ocrResult.confidence,
          identificationMethod: 'ocr',
          pokemonTcgApiId: matchedCard.id,
        },
      });

      return {
        cardName: matchedCard.name,
        cardSet: matchedCard.set,
        cardYear: this.parseYear(matchedCard.releaseDate),
        cardNumber: matchedCard.number,
        cardType: matchedCard.supertype,
        confidence: ocrResult.confidence,
        method: 'ocr',
        extractedText: ocrResult.extractedText,
        apiId: matchedCard.id,
      };
    } catch (error) {
      this.logger.warn(`Failed to match card: ${error.message}`);

      // Store partial OCR result
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          cardName: ocrResult.cardName || 'Unknown',
          identificationConfidence: ocrResult.confidence,
          identificationMethod: 'ocr-partial',
        },
      });

      // Return partial identification
      return {
        cardName: ocrResult.cardName || 'Unknown',
        confidence: ocrResult.confidence,
        method: 'ocr-partial',
        extractedText: ocrResult.extractedText,
      };
    }
  }

  private parseYear(dateString?: string): number | null {
    if (!dateString) return null;
    return parseInt(dateString.substring(0, 4), 10);
  }
}
```

**sessions.controller.ts (ajout)**
```typescript
@Post(':id/identify')
@ApiOperation({ summary: 'Identify card from uploaded images' })
@ApiResponse({
  status: 200,
  description: 'Card successfully identified',
  type: CardIdentificationDto
})
async identifyCard(
  @Param('id', ParseUUIDPipe) id: string,
  @Query('userId', ParseIntPipe) userId: number,
): Promise<CardIdentificationDto> {
  return this.sessionsService.identifyCard(id, userId);
}
```

#### 4.6. Modifications ML Service

**ml.service.ts (ajout)**
```typescript
interface IOCRResult {
  extractedText: string[];
  cardName?: string;
  confidence: number;
}

async extractCardInfo(imagePath: string): Promise<IOCRResult> {
  this.logger.log(`Extracting card info from image: ${imagePath}`);

  try {
    const response = await firstValueFrom(
      this.httpService.post<IOCRResult>(
        `${this.mlServiceUrl}/ocr`,
        { image_path: imagePath },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
          },
        }
      )
    );

    return response.data;
  } catch (error) {
    this.logger.error(`OCR extraction failed: ${error.message}`);
    throw new MlAnalysisFailedException('Failed to extract card information');
  }
}
```

---

## Phase 2C - Prix en temps réel

### 1. APIs de pricing recommandées

#### 1.1. TCGPlayer API

**URL**: https://api.tcgplayer.com
**Prix**: Gratuit (nécessite compte développeur)
**Quotas**: 300 requêtes/jour (tier gratuit), 10 000/jour (tier Business)

**Avantages**:
- API officielle du plus grand marketplace US
- Prix réels (marketplace pricing)
- Historique de prix disponible
- Documentation complète

**Inconvénients**:
- Authentification OAuth complexe
- Quotas limités en gratuit
- Principalement marché US

**Flux d'authentification**:
```typescript
// 1. Get Bearer token
POST https://api.tcgplayer.com/token
Body: grant_type=client_credentials&client_id=X&client_secret=Y

// 2. Search product
GET https://api.tcgplayer.com/catalog/products?categoryId=3&productName=Charizard

// 3. Get pricing
GET https://api.tcgplayer.com/pricing/product/{productId}
```

#### 1.2. CardMarket API (MKM)

**URL**: https://api.cardmarket.com/ws/v2.0
**Prix**: Gratuit (nécessite compte vendeur)

**Avantages**:
- Leader européen
- Pricing en EUR
- API robuste

**Inconvénients**:
- OAuth 1.0 (complexe)
- Nécessite compte vendeur
- Documentation moins claire

#### 1.3. PriceCharting API

**URL**: https://www.pricecharting.com/api
**Prix**: 30$/mois (pas de tier gratuit)

**Avantages**:
- Simple à intégrer
- Prix historiques
- Multi-gaming (pas que Pokémon)

**Inconvénients**:
- Payant uniquement
- Moins adapté pour Pokémon TCG

**Recommandation**:
- **TCGPlayer** comme source principale (marché US)
- **CardMarket** comme source secondaire (marché EU)
- Afficher les deux prix si disponibles

---

### 2. Architecture pricing

#### 2.1. Nouveau module Pricing

```
apps/api/src/cards/pricing/
├── pricing.service.ts
├── dto/
│   ├── card-pricing.dto.ts
│   └── index.ts
├── interfaces/
│   ├── pricing-provider.interface.ts
│   └── index.ts
├── providers/
│   ├── tcgplayer-pricing.provider.ts
│   ├── cardmarket-pricing.provider.ts
│   └── index.ts
└── exceptions/
    ├── pricing-unavailable.exception.ts
    └── index.ts
```

#### 2.2. DTOs

**card-pricing.dto.ts**
```typescript
export class PriceSourceDto {
  @ApiProperty({ enum: ['tcgplayer', 'cardmarket', 'ebay'] })
  source: string;

  @ApiProperty({ description: 'Price in specified currency' })
  price: number;

  @ApiProperty({ enum: ['USD', 'EUR'] })
  currency: string;

  @ApiProperty({ required: false })
  url?: string;

  @ApiProperty({ required: false })
  marketPrice?: number;

  @ApiProperty({ required: false })
  lowPrice?: number;

  @ApiProperty({ required: false })
  highPrice?: number;

  @ApiProperty()
  lastUpdated: Date;
}

export class CardPricingDto {
  @ApiProperty()
  cardName: string;

  @ApiProperty()
  cardSet: string;

  @ApiProperty({ required: false })
  cardNumber?: string;

  @ApiProperty({ required: false })
  grade?: number;

  @ApiProperty({ type: [PriceSourceDto] })
  sources: PriceSourceDto[];

  @ApiProperty({ required: false, description: 'Average price across sources' })
  averagePrice?: number;

  @ApiProperty({ enum: ['USD', 'EUR'] })
  currency: string;

  @ApiProperty({ required: false })
  pricesByGrade?: Record<number, number>;

  @ApiProperty()
  retrievedAt: Date;
}
```

#### 2.3. Services

**pricing.service.ts**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TcgplayerPricingProvider } from './providers/tcgplayer-pricing.provider';
import { CardmarketPricingProvider } from './providers/cardmarket-pricing.provider';
import { CardPricingDto, PriceSourceDto } from './dto';
import { PricingUnavailableException } from './exceptions';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);
  private readonly enableTcgplayer: boolean;
  private readonly enableCardmarket: boolean;

  constructor(
    private readonly tcgplayerProvider: TcgplayerPricingProvider,
    private readonly cardmarketProvider: CardmarketPricingProvider,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.enableTcgplayer = this.configService.get<boolean>('ENABLE_TCGPLAYER', true);
    this.enableCardmarket = this.configService.get<boolean>('ENABLE_CARDMARKET', false);
  }

  /**
   * Get pricing for a card from all available sources
   */
  async getCardPricing(
    cardName: string,
    cardSet: string,
    cardNumber?: string,
    grade?: number,
  ): Promise<CardPricingDto> {
    const cacheKey = this.buildCacheKey(cardName, cardSet, cardNumber, grade);

    // Check cache first
    const cached = await this.cacheManager.get<CardPricingDto>(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for: ${cacheKey}`);
      return cached;
    }

    this.logger.log(`Fetching pricing for: ${cardName} - ${cardSet}`);

    // Fetch from all enabled providers in parallel
    const promises: Promise<PriceSourceDto | null>[] = [];

    if (this.enableTcgplayer) {
      promises.push(
        this.tcgplayerProvider.getPrice(cardName, cardSet, cardNumber, grade)
          .catch(error => {
            this.logger.warn(`TCGPlayer pricing failed: ${error.message}`);
            return null;
          })
      );
    }

    if (this.enableCardmarket) {
      promises.push(
        this.cardmarketProvider.getPrice(cardName, cardSet, cardNumber, grade)
          .catch(error => {
            this.logger.warn(`CardMarket pricing failed: ${error.message}`);
            return null;
          })
      );
    }

    const results = await Promise.all(promises);
    const sources = results.filter(r => r !== null) as PriceSourceDto[];

    if (sources.length === 0) {
      throw new PricingUnavailableException(
        'No pricing sources available for this card'
      );
    }

    // Calculate average price (convert to USD if needed)
    const pricesInUsd = sources.map(s =>
      s.currency === 'EUR' ? s.price * 1.1 : s.price // Simple conversion
    );
    const averagePrice = pricesInUsd.reduce((a, b) => a + b, 0) / pricesInUsd.length;

    // Estimate prices by grade (if not provided)
    const pricesByGrade = grade ? undefined : this.estimatePricesByGrade(averagePrice);

    const pricing: CardPricingDto = {
      cardName,
      cardSet,
      cardNumber,
      grade,
      sources,
      averagePrice: Math.round(averagePrice * 100) / 100,
      currency: 'USD',
      pricesByGrade,
      retrievedAt: new Date(),
    };

    // Cache for 1 hour
    await this.cacheManager.set(cacheKey, pricing, 3600 * 1000);

    return pricing;
  }

  /**
   * Estimate prices for all grades based on a reference price (grade 10)
   */
  private estimatePricesByGrade(priceGrade10: number): Record<number, number> {
    // Approximate multipliers based on industry standards
    const multipliers = {
      10: 1.0,
      9: 0.65,
      8: 0.45,
      7: 0.30,
      6: 0.20,
      5: 0.15,
      4: 0.10,
      3: 0.08,
      2: 0.05,
      1: 0.03,
    };

    const prices: Record<number, number> = {};
    for (const [grade, multiplier] of Object.entries(multipliers)) {
      prices[parseInt(grade)] = Math.round(priceGrade10 * multiplier * 100) / 100;
    }

    return prices;
  }

  private buildCacheKey(
    cardName: string,
    cardSet: string,
    cardNumber?: string,
    grade?: number,
  ): string {
    return `pricing:${cardName}:${cardSet}:${cardNumber || 'none'}:${grade || 'all'}`;
  }
}
```

**providers/tcgplayer-pricing.provider.ts**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PriceSourceDto } from '../dto';

interface TCGPlayerAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface TCGPlayerProduct {
  productId: number;
  name: string;
  url: string;
}

interface TCGPlayerPrice {
  productId: number;
  lowPrice: number;
  midPrice: number;
  highPrice: number;
  marketPrice: number;
  subTypeName: string;
}

@Injectable()
export class TcgplayerPricingProvider {
  private readonly logger = new Logger(TcgplayerPricingProvider.name);
  private readonly apiUrl = 'https://api.tcgplayer.com';
  private readonly publicKey: string;
  private readonly privateKey: string;

  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.publicKey = this.configService.get<string>('TCGPLAYER_PUBLIC_KEY', '');
    this.privateKey = this.configService.get<string>('TCGPLAYER_PRIVATE_KEY', '');
  }

  async getPrice(
    cardName: string,
    cardSet: string,
    cardNumber?: string,
    grade?: number,
  ): Promise<PriceSourceDto> {
    await this.ensureAuthenticated();

    // 1. Search for product
    const product = await this.searchProduct(cardName, cardSet);

    if (!product) {
      throw new Error(`Product not found: ${cardName} - ${cardSet}`);
    }

    // 2. Get pricing for product
    const pricing = await this.getProductPricing(product.productId);

    // 3. Adjust price based on grade (if provided)
    const adjustedPrice = grade
      ? this.adjustPriceForGrade(pricing.marketPrice, grade)
      : pricing.marketPrice;

    return {
      source: 'tcgplayer',
      price: adjustedPrice,
      currency: 'USD',
      url: product.url,
      marketPrice: pricing.marketPrice,
      lowPrice: pricing.lowPrice,
      highPrice: pricing.highPrice,
      lastUpdated: new Date(),
    };
  }

  private async ensureAuthenticated(): Promise<void> {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return;
    }

    // Get new token
    this.logger.log('Authenticating with TCGPlayer API');

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', this.publicKey);
    params.append('client_secret', this.privateKey);

    const response = await firstValueFrom(
      this.httpService.post<TCGPlayerAuthResponse>(
        `${this.apiUrl}/token`,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);

    this.logger.log('TCGPlayer authentication successful');
  }

  private async searchProduct(
    cardName: string,
    cardSet: string,
  ): Promise<TCGPlayerProduct | null> {
    const response = await firstValueFrom(
      this.httpService.get<{ results: TCGPlayerProduct[] }>(
        `${this.apiUrl}/catalog/products`,
        {
          params: {
            categoryId: 3, // Pokémon category
            productName: cardName,
            setName: cardSet,
          },
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      )
    );

    return response.data.results[0] || null;
  }

  private async getProductPricing(productId: number): Promise<TCGPlayerPrice> {
    const response = await firstValueFrom(
      this.httpService.get<{ results: TCGPlayerPrice[] }>(
        `${this.apiUrl}/pricing/product/${productId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      )
    );

    // Get the first "Normal" or "Holofoil" subtype pricing
    const price = response.data.results.find(
      p => p.subTypeName === 'Normal' || p.subTypeName === 'Holofoil'
    );

    return price || response.data.results[0];
  }

  private adjustPriceForGrade(basePrice: number, grade: number): number {
    // Price multipliers based on grade
    const multipliers: Record<number, number> = {
      10: 1.0,
      9: 0.65,
      8: 0.45,
      7: 0.30,
      6: 0.20,
      5: 0.15,
      4: 0.10,
      3: 0.08,
      2: 0.05,
      1: 0.03,
    };

    return basePrice * (multipliers[grade] || 0.1);
  }
}
```

#### 2.4. Extension CardsController

**cards.controller.ts (ajout)**
```typescript
constructor(
  private readonly cardsService: CardsService,
  private readonly pricingService: PricingService, // ← Injection
) {}

@Get('pricing')
@ApiOperation({ summary: 'Get card pricing from multiple sources' })
@ApiResponse({
  status: 200,
  type: CardPricingDto
})
async getCardPricing(
  @Query('name') cardName: string,
  @Query('set') cardSet: string,
  @Query('number') cardNumber?: string,
  @Query('grade', new DefaultValuePipe(10), ParseIntPipe) grade?: number,
): Promise<CardPricingDto> {
  return this.pricingService.getCardPricing(
    cardName,
    cardSet,
    cardNumber,
    grade,
  );
}
```

---

### 3. Cache et Rate Limiting

#### 3.1. Cache Redis

**Installation**
```bash
npm install cache-manager cache-manager-redis-store
npm install --save-dev @types/cache-manager
```

**app.module.ts (configuration)**
```typescript
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      ttl: 3600, // 1 hour default TTL
    }),
    // ... other imports
  ],
})
```

**Stratégie de cache**:
- **Card metadata**: TTL 7 jours (données statiques)
- **Pricing**: TTL 1 heure (données dynamiques)
- **OCR results**: TTL 24 heures (pour retry)

#### 3.2. Rate Limiting

**Installation**
```bash
npm install @nestjs/throttler
```

**app.module.ts (configuration)**
```typescript
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 10,  // 10 requests per minute
    }]),
    // ... other imports
  ],
})
```

**cards.controller.ts (protection)**
```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('cards')
@UseGuards(ThrottlerGuard)
export class CardsController {

  @Get('pricing')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 req/min for pricing
  async getCardPricing(...) {}
}
```

---

### 4. Variables d'environnement

**.env.example**
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/pokemon_cards"

# ML Service
ML_SERVICE_URL="http://localhost:5000"
ML_API_KEY="dev-api-key"
ML_TIMEOUT=30000
ML_MAX_RETRIES=3
ML_ENABLE_FALLBACK=true

# PokémonTCG API
POKEMON_TCG_API_KEY=""  # Optional, increases rate limit

# TCGPlayer API
TCGPLAYER_PUBLIC_KEY=""
TCGPLAYER_PRIVATE_KEY=""
ENABLE_TCGPLAYER=true

# CardMarket API
CARDMARKET_API_KEY=""
CARDMARKET_API_SECRET=""
CARDMARKET_ACCESS_TOKEN=""
CARDMARKET_ACCESS_TOKEN_SECRET=""
ENABLE_CARDMARKET=false

# Redis Cache
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_TTL=3600

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=10
```

---

## Gestion des erreurs

### 1. Exceptions personnalisées

**cards/exceptions/card-not-found.exception.ts**
```typescript
import { NotFoundException } from '@nestjs/common';

export class CardNotFoundException extends NotFoundException {
  constructor(cardName: string, cardSet?: string) {
    super(
      `Card not found: ${cardName}${cardSet ? ` in set ${cardSet}` : ''}`
    );
  }
}
```

**cards/exceptions/pricing-unavailable.exception.ts**
```typescript
import { ServiceUnavailableException } from '@nestjs/common';

export class PricingUnavailableException extends ServiceUnavailableException {
  constructor(message = 'Pricing information is currently unavailable') {
    super(message);
  }
}
```

### 2. Global Exception Filter

**common/filters/http-exception.filter.ts**
```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message,
    };

    this.logger.error(
      `HTTP ${status} Error: ${JSON.stringify(errorResponse)}`
    );

    response.status(status).json(errorResponse);
  }
}
```

---

## Tests

### 1. Tests unitaires

**cards.service.spec.ts**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CardsService } from './cards.service';
import { PokemonTcgProvider } from './providers/pokemon-tcg.provider';

describe('CardsService', () => {
  let service: CardsService;
  let pokemonTcgProvider: PokemonTcgProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardsService,
        {
          provide: PokemonTcgProvider,
          useValue: {
            searchCards: jest.fn(),
            getCard: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CardsService>(CardsService);
    pokemonTcgProvider = module.get<PokemonTcgProvider>(PokemonTcgProvider);
  });

  describe('searchCards', () => {
    it('should return search results', async () => {
      const mockResults = [
        { id: '1', name: 'Charizard', set: 'Base Set' },
      ];

      jest.spyOn(pokemonTcgProvider, 'searchCards').mockResolvedValue(mockResults);

      const results = await service.searchCards('Charizard');

      expect(results).toEqual(mockResults);
      expect(pokemonTcgProvider.searchCards).toHaveBeenCalledWith('Charizard', 10);
    });
  });

  describe('matchCard', () => {
    it('should match card from extracted text', async () => {
      const mockCard = {
        id: 'xy1-1',
        name: 'Charizard',
        set: 'Base Set',
        number: '4',
      };

      jest.spyOn(pokemonTcgProvider, 'searchCards').mockResolvedValue([mockCard]);
      jest.spyOn(pokemonTcgProvider, 'getCard').mockResolvedValue(mockCard);

      const result = await service.matchCard({
        extractedText: ['Charizard', 'Base Set', '4/102'],
      });

      expect(result.name).toBe('Charizard');
    });
  });
});
```

**pricing.service.spec.ts**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PricingService } from './pricing.service';
import { TcgplayerPricingProvider } from './providers/tcgplayer-pricing.provider';

describe('PricingService', () => {
  let service: PricingService;
  let cacheManager: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: TcgplayerPricingProvider,
          useValue: {
            getPrice: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  describe('getCardPricing', () => {
    it('should return cached pricing if available', async () => {
      const cachedPricing = { cardName: 'Charizard', sources: [] };

      jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedPricing);

      const result = await service.getCardPricing('Charizard', 'Base Set');

      expect(result).toEqual(cachedPricing);
      expect(cacheManager.get).toHaveBeenCalled();
    });
  });
});
```

### 2. Tests E2E

**cards.e2e-spec.ts**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('CardsController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/cards/search (GET)', () => {
    return request(app.getHttpServer())
      .get('/cards/search?query=Charizard')
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeInstanceOf(Array);
      });
  });

  it('/cards/pricing (GET)', () => {
    return request(app.getHttpServer())
      .get('/cards/pricing?name=Charizard&set=Base%20Set')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('sources');
        expect(res.body).toHaveProperty('averagePrice');
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

---

## Documentation Swagger

**cards.controller.ts (annotations complètes)**
```typescript
@Controller('cards')
@ApiTags('Cards')
@ApiBearerAuth()
export class CardsController {

  @Get('search')
  @ApiOperation({
    summary: 'Search Pokémon cards',
    description: 'Search for cards by name, set, or other criteria'
  })
  @ApiQuery({ name: 'query', description: 'Search query', example: 'Charizard' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results', example: 10 })
  @ApiResponse({
    status: 200,
    description: 'List of matching cards',
    type: [CardSearchResultDto]
  })
  async searchCards(...) {}

  @Get('pricing')
  @ApiOperation({
    summary: 'Get card pricing',
    description: 'Retrieve pricing information from multiple marketplaces'
  })
  @ApiQuery({ name: 'name', description: 'Card name', example: 'Charizard' })
  @ApiQuery({ name: 'set', description: 'Set name', example: 'Base Set' })
  @ApiQuery({ name: 'number', required: false, description: 'Card number', example: '4' })
  @ApiQuery({ name: 'grade', required: false, description: 'Grade (1-10)', example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Pricing information',
    type: CardPricingDto
  })
  @ApiResponse({
    status: 503,
    description: 'Pricing unavailable'
  })
  async getCardPricing(...) {}
}
```

---

## Ordre d'implémentation recommandé

### Phase 2B - Reconnaissance de carte (Priorité 1)

**Étape 1: Setup infrastructure (1 jour)**
1. Migration Prisma pour nouveaux champs Session
2. Installation dépendances (axios, cache-manager)
3. Configuration variables d'environnement

**Étape 2: Module Cards - Identification (2 jours)**
1. Créer structure module Cards
2. Implémenter PokemonTcgProvider
3. Implémenter CardsService avec matching logic
4. Créer DTOs et interfaces
5. Tests unitaires

**Étape 3: Intégration ML Service (1 jour)**
1. Ajouter endpoint OCR au ML service Python
2. Implémenter extractCardInfo() dans MlService
3. Tests d'intégration

**Étape 4: Intégration Sessions (1 jour)**
1. Ajouter identifyCard() dans SessionsService
2. Créer endpoint POST /sessions/:id/identify
3. Tests E2E du flux complet

**Durée estimée**: **5 jours**

---

### Phase 2C - Prix en temps réel (Priorité 2)

**Étape 1: Setup providers externes (1 jour)**
1. Créer comptes développeur TCGPlayer
2. Configurer clés API
3. Tester authentification

**Étape 2: Module Pricing (2 jours)**
1. Créer PricingService
2. Implémenter TcgplayerPricingProvider
3. Implémenter CardmarketPricingProvider (optionnel)
4. DTOs et interfaces
5. Tests unitaires

**Étape 3: Cache Redis (1 jour)**
1. Setup Redis local/production
2. Configurer CacheModule
3. Implémenter stratégie de cache
4. Tests de cache

**Étape 4: Rate Limiting (0.5 jour)**
1. Configuration ThrottlerModule
2. Application aux endpoints sensibles
3. Tests de rate limiting

**Étape 5: Intégration finale (1.5 jours)**
1. Endpoint GET /cards/pricing
2. Documentation Swagger complète
3. Tests E2E
4. Monitoring et logging

**Durée estimée**: **6 jours**

---

## Estimation de complexité

### Phase 2B - Reconnaissance OCR

| Tâche | Complexité | Durée |
|-------|-----------|-------|
| Migration Prisma | Faible | 0.5j |
| PokemonTcgProvider | Moyenne | 1j |
| CardsService matching logic | Élevée | 1.5j |
| ML Service OCR integration | Moyenne | 1j |
| Sessions integration | Faible | 0.5j |
| Tests | Moyenne | 0.5j |
| **TOTAL** | - | **5j** |

**Risques**:
- Qualité OCR dépend du preprocessing (mitigation: guider l'utilisateur)
- Matching fuzzy peut échouer (mitigation: permettre correction manuelle)
- PokémonTCG API quotas (mitigation: cache + fallback TCGdex)

---

### Phase 2C - Prix en temps réel

| Tâche | Complexité | Durée |
|-------|-----------|-------|
| Setup comptes API externes | Faible | 0.5j |
| TcgplayerPricingProvider | Élevée | 1.5j |
| PricingService | Moyenne | 1j |
| Cache Redis | Moyenne | 1j |
| Rate limiting | Faible | 0.5j |
| Integration + tests | Moyenne | 1.5j |
| **TOTAL** | - | **6j** |

**Risques**:
- Validation compte TCGPlayer (délai admin 1-2 jours)
- Quotas API limités (mitigation: cache agressif)
- Conversion de devises EUR/USD (mitigation: taux fixes ou API externe)
- Authentification OAuth complexe (mitigation: bonne doc + exemples)

---

## Dépendances NPM

**package.json (ajouts)**
```json
{
  "dependencies": {
    "@nestjs/axios": "4.0.1",  // ✅ Déjà présent
    "@nestjs/cache-manager": "^2.2.0",  // ← Ajouter
    "@nestjs/throttler": "^5.1.2",  // ← Ajouter
    "cache-manager": "^5.4.0",  // ← Ajouter
    "cache-manager-redis-store": "^3.0.1",  // ← Ajouter
    "axios": "1.13.2"  // ✅ Déjà présent
  },
  "devDependencies": {
    "@types/cache-manager": "^4.0.6"  // ← Ajouter
  }
}
```

**Installation**
```bash
cd apps/api
npm install @nestjs/cache-manager @nestjs/throttler cache-manager cache-manager-redis-store
npm install --save-dev @types/cache-manager
```

---

## Checklist d'implémentation

### Phase 2B - OCR

- [ ] Migration Prisma avec nouveaux champs Session
- [ ] Module Cards créé avec structure complète
- [ ] PokemonTcgProvider implémenté et testé
- [ ] TcgdexProvider implémenté (fallback)
- [ ] CardsService avec logique de matching
- [ ] MlService.extractCardInfo() implémenté
- [ ] SessionsService.identifyCard() implémenté
- [ ] Endpoint POST /sessions/:id/identify
- [ ] DTOs et interfaces documentés
- [ ] Tests unitaires (>80% coverage)
- [ ] Tests E2E du flux complet
- [ ] Documentation Swagger à jour
- [ ] Gestion d'erreurs robuste
- [ ] Logging approprié

### Phase 2C - Pricing

- [ ] Comptes développeur TCGPlayer créés
- [ ] Variables d'environnement configurées
- [ ] Redis installé et configuré
- [ ] CacheModule configuré dans AppModule
- [ ] ThrottlerModule configuré
- [ ] PricingService implémenté
- [ ] TcgplayerPricingProvider implémenté
- [ ] CardmarketPricingProvider implémenté (optionnel)
- [ ] Endpoint GET /cards/pricing
- [ ] Stratégie de cache implémentée
- [ ] Rate limiting appliqué
- [ ] Tests unitaires providers
- [ ] Tests E2E pricing
- [ ] Documentation Swagger complète
- [ ] Monitoring des quotas API

---

## Monitoring et observabilité

### Métriques à suivre

**Phase 2B - OCR**
- Taux de succès d'identification (%)
- Confiance moyenne des identifications
- Taux de corrections manuelles
- Temps moyen d'identification
- Erreurs OCR par type

**Phase 2C - Pricing**
- Taux de cache hit (%)
- Latence des appels API externes
- Quotas API consommés / restants
- Erreurs pricing par provider
- Taux de fallback

### Logging recommandé

```typescript
// Exemple de logging structuré
this.logger.log({
  action: 'card_identified',
  sessionId,
  cardName,
  confidence,
  method: 'ocr',
  duration: Date.now() - startTime,
});

this.logger.log({
  action: 'pricing_fetched',
  cardName,
  sources: sources.length,
  cached: false,
  duration: Date.now() - startTime,
});
```

---

## Conclusion

Ce plan couvre l'implémentation complète des phases 2B et 2C avec:

### Architecture solide
- Séparation des responsabilités (Sessions, Cards, Pricing)
- Providers modulaires pour APIs externes
- Cache et rate limiting pour performance

### APIs recommandées
- **PokémonTCG API**: Identification de cartes (gratuit, robuste)
- **Tesseract OCR**: Extraction de texte (gratuit, local)
- **TCGPlayer API**: Pricing marketplace (gratuit avec limitations)

### Sécurité et performance
- Cache Redis (TTL adaptatifs)
- Rate limiting par endpoint
- Gestion d'erreurs robuste
- Fallbacks multiples

### Estimation réaliste
- **Phase 2B**: 5 jours (identification OCR)
- **Phase 2C**: 6 jours (pricing temps réel)
- **Total**: **11 jours** de développement backend

### Prochaines étapes
1. Valider ce plan avec l'agent principal
2. Créer comptes développeur APIs externes (TCGPlayer)
3. Commencer par Phase 2B (fondation pour 2C)
4. Itérer selon feedback utilisateurs

Le plan respecte l'architecture NestJS existante, s'intègre avec Prisma/PostgreSQL, et maintient la règle métier: toute logique métier reste côté backend.
