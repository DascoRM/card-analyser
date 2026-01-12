import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PokemonTcgProvider } from './providers/pokemon-tcg.provider';
import { TcgdexProvider } from './providers/tcgdex.provider';
import {
  MatchCardDto,
  CardMetadataDto,
  CardSearchResultDto,
} from './dto';
import { CardNotFoundException } from './exceptions';

interface ParsedCardInfo {
  name?: string;
  set?: string;
  number?: string;
}

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
   * Uses PokémonTCG API as primary, TCGdex as fallback
   */
  async searchCards(
    query: string,
    limit = 10,
  ): Promise<CardSearchResultDto[]> {
    this.logger.log(`Searching cards with query: ${query}`);

    try {
      // Try PokémonTCG API first
      return await this.pokemonTcgProvider.searchCards(
        `name:"${query}"`,
        limit,
      );
    } catch (error) {
      this.logger.warn(
        `PokemonTCG API failed, trying TCGdex: ${error.message}`,
      );

      // Fallback to TCGdex
      try {
        return await this.tcgdexProvider.searchCards(query, limit);
      } catch (fallbackError) {
        this.logger.error(`TCGdex also failed: ${fallbackError.message}`);
        return [];
      }
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
  async matchCard(matchDto: MatchCardDto): Promise<CardMetadataDto | null> {
    const { extractedText, cardName, cardSet } = matchDto;

    this.logger.log(
      `Matching card from: ${JSON.stringify({ extractedText, cardName, cardSet })}`,
    );

    // Strategy 1: If cardName provided directly, use it
    if (cardName) {
      const results = await this.searchByNameAndSet(cardName, cardSet);

      if (results.length > 0) {
        return this.pokemonTcgProvider.getCard(results[0].id);
      }
    }

    // Strategy 2: Parse extracted text
    const parsedInfo = this.parseExtractedText(extractedText);
    this.logger.log(`Parsed info: ${JSON.stringify(parsedInfo)}`);

    if (parsedInfo.name) {
      const results = await this.searchByNameAndSet(
        parsedInfo.name,
        parsedInfo.set,
      );

      if (results.length > 0) {
        // Apply fuzzy matching to find best match
        const bestMatch = this.findBestMatch(parsedInfo, results);
        return this.pokemonTcgProvider.getCard(bestMatch.id);
      }
    }

    // Strategy 3: Try searching with each line of extracted text
    for (const line of extractedText) {
      const cleanedLine = this.cleanTextForSearch(line);
      if (cleanedLine.length >= 3) {
        const results = await this.searchCards(cleanedLine, 5);
        if (results.length > 0) {
          return this.pokemonTcgProvider.getCard(results[0].id);
        }
      }
    }

    this.logger.warn('Unable to match card from provided information');
    return null;
  }

  /**
   * Search by name and optional set
   */
  private async searchByNameAndSet(
    name: string,
    set?: string,
  ): Promise<CardSearchResultDto[]> {
    try {
      return await this.pokemonTcgProvider.searchByName(name, set, 5);
    } catch (error) {
      this.logger.warn(`Search by name failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Parse extracted text to identify card information
   */
  private parseExtractedText(lines: string[]): ParsedCardInfo {
    // Card name is typically the first line (largest text on the card)
    // We filter out common non-name text
    const nonNamePatterns = [
      /^\d+$/,           // Just numbers
      /^HP\s*\d+$/i,     // HP values
      /^\d+\/\d+$/,      // Card numbers
      /^stage\s*\d*/i,   // Stage indicators
      /^basic$/i,        // Basic indicator
      /^©/,              // Copyright
      /^Pokemon$/i,      // Pokemon text
    ];

    let name: string | undefined;

    // Find the first line that looks like a card name
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip if matches any non-name pattern
      if (nonNamePatterns.some((pattern) => pattern.test(trimmed))) {
        continue;
      }

      // Skip very short or very long lines
      if (trimmed.length < 2 || trimmed.length > 30) {
        continue;
      }

      // This looks like a name
      name = trimmed;
      break;
    }

    // Look for card number pattern (e.g., "025/102", "4/102")
    const numberPattern = /(\d{1,3})\/(\d{1,3})/;
    const numberLine = lines.find((line) => numberPattern.test(line));
    const numberMatch = numberLine?.match(numberPattern);
    const number = numberMatch
      ? `${numberMatch[1]}/${numberMatch[2]}`
      : undefined;

    // Try to identify set from known patterns
    // (This is simplified - real implementation would have a database of set names)
    const set = this.identifySet(lines);

    return { name, number, set };
  }

  /**
   * Try to identify set name from extracted text
   */
  private identifySet(lines: string[]): string | undefined {
    const knownSets = [
      'Base Set',
      'Jungle',
      'Fossil',
      'Team Rocket',
      'Base Set 2',
      'Gym Heroes',
      'Gym Challenge',
      'Neo Genesis',
      'Neo Discovery',
      'Neo Revelation',
      'Neo Destiny',
      'Legendary Collection',
      'Expedition',
      'Aquapolis',
      'Skyridge',
      'Scarlet & Violet',
      'Paldea Evolved',
      'Obsidian Flames',
      '151',
      'Temporal Forces',
    ];

    for (const line of lines) {
      const normalizedLine = line.toLowerCase().trim();
      for (const set of knownSets) {
        if (normalizedLine.includes(set.toLowerCase())) {
          return set;
        }
      }
    }

    return undefined;
  }

  /**
   * Clean text for search
   */
  private cleanTextForSearch(text: string): string {
    return text
      .replace(/[^a-zA-Z0-9\s'-]/g, '') // Remove special chars except hyphens and apostrophes
      .replace(/\s+/g, ' ')             // Normalize whitespace
      .trim();
  }

  /**
   * Find best matching card using similarity score
   */
  private findBestMatch(
    parsed: ParsedCardInfo,
    candidates: CardSearchResultDto[],
  ): CardSearchResultDto {
    let bestScore = 0;
    let bestMatch = candidates[0];

    for (const candidate of candidates) {
      let score = 0;

      // Name similarity
      if (parsed.name) {
        const parsedName = parsed.name.toLowerCase();
        const candidateName = candidate.name.toLowerCase();

        // Exact match
        if (candidateName === parsedName) {
          score += 100;
        }
        // Contains match
        else if (candidateName.includes(parsedName)) {
          score += 50;
        }
        // Partial word match
        else if (
          parsedName.split(' ').some((word) => candidateName.includes(word))
        ) {
          score += 25;
        }
      }

      // Number match
      if (parsed.number && candidate.number === parsed.number) {
        score += 80;
      }

      // Set match
      if (parsed.set && candidate.set) {
        const parsedSet = parsed.set.toLowerCase();
        const candidateSet = candidate.set.toLowerCase();

        if (candidateSet === parsedSet) {
          score += 60;
        } else if (candidateSet.includes(parsedSet)) {
          score += 30;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    this.logger.log(
      `Best match: ${bestMatch.name} (score: ${bestScore})`,
    );

    return bestMatch;
  }
}
