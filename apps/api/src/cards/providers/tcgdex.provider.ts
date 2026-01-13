import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CardSearchResultDto, CardMetadataDto } from '../dto';

/**
 * TCGdex API response interfaces
 * API Documentation: https://tcgdex.dev/
 */
interface ITCGdexCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
  category: string;
  illustrator?: string;
  rarity?: string;
  hp?: number;
  types?: string[];
  set: {
    id: string;
    name: string;
    releaseDate?: string;
  };
}

interface ITCGdexSearchResult {
  id: string;
  name: string;
  image?: string;
}

@Injectable()
export class TcgdexProvider {
  private readonly logger = new Logger(TcgdexProvider.name);
  private readonly apiUrl = 'https://api.tcgdex.net/v2/en';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Search cards by name
   * @param query - Card name to search
   * @param limit - Maximum number of results
   */
  async searchCards(
    query: string,
    limit = 10,
  ): Promise<CardSearchResultDto[]> {
    try {
      this.logger.log(`TCGdex: Searching cards with query: ${query}`);

      // TCGdex search endpoint
      const response = await firstValueFrom(
        this.httpService.get<ITCGdexSearchResult[]>(
          `${this.apiUrl}/cards`,
          {
            params: {
              name: query,
            },
          },
        ),
      );

      // TCGdex returns all cards, we need to filter and limit
      const filteredCards = response.data
        .filter((card) =>
          card.name.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, limit);

      // Fetch details for each card to get full metadata
      const detailedCards = await Promise.all(
        filteredCards.map((card) => this.getCard(card.id).catch(() => null)),
      );

      return detailedCards
        .filter((card): card is CardMetadataDto => card !== null)
        .map((card) => ({
          id: card.id,
          name: card.name,
          set: card.set,
          number: card.number,
          rarity: card.rarity,
          imageUrl: card.imageUrl,
          releaseDate: card.releaseDate,
        }));
    } catch (error) {
      this.logger.error(`TCGdex search failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get card details by ID
   * @param id - TCGdex card ID
   */
  async getCard(id: string): Promise<CardMetadataDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<ITCGdexCard>(`${this.apiUrl}/cards/${id}`),
      );

      const card = response.data;

      return {
        id: card.id,
        name: card.name,
        set: card.set.name,
        number: card.localId,
        rarity: card.rarity,
        imageUrl: card.image ? `${card.image}/high.webp` : undefined,
        releaseDate: card.set.releaseDate,
        artist: card.illustrator,
        hp: card.hp?.toString(),
        types: card.types,
        supertype: card.category,
      };
    } catch (error) {
      this.logger.error(`TCGdex get card failed: ${error.message}`);
      throw error;
    }
  }
}
