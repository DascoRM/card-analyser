import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CardSearchResultDto, CardMetadataDto } from '../dto';
import {
  IPokemonTCGCard,
  IPokemonTCGResponse,
} from '../interfaces/pokemon-tcg-api.interface';

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

  /**
   * Search cards by query string
   * @param query - Search query (e.g., "Charizard" or "name:Pikachu set.name:Base")
   * @param limit - Maximum number of results
   */
  async searchCards(
    query: string,
    limit = 10,
  ): Promise<CardSearchResultDto[]> {
    try {
      this.logger.log(`Searching cards with query: ${query}`);

      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers['X-Api-Key'] = this.apiKey;
      }

      const response = await firstValueFrom(
        this.httpService.get<IPokemonTCGResponse<IPokemonTCGCard[]>>(
          `${this.apiUrl}/cards`,
          {
            params: {
              q: query,
              pageSize: limit,
            },
            headers,
          },
        ),
      );

      return response.data.data.map((card) => this.mapToSearchResult(card));
    } catch (error) {
      this.logger.error(`Failed to search cards: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get card details by ID
   * @param id - PokémonTCG API card ID
   */
  async getCard(id: string): Promise<CardMetadataDto> {
    try {
      this.logger.log(`Getting card details for ID: ${id}`);

      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers['X-Api-Key'] = this.apiKey;
      }

      const response = await firstValueFrom(
        this.httpService.get<IPokemonTCGResponse<IPokemonTCGCard>>(
          `${this.apiUrl}/cards/${id}`,
          { headers },
        ),
      );

      return this.mapToMetadata(response.data.data);
    } catch (error) {
      this.logger.error(`Failed to get card ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search cards by name with optional set filter
   * @param name - Card name
   * @param set - Optional set name
   * @param limit - Maximum number of results
   */
  async searchByName(
    name: string,
    set?: string,
    limit = 10,
  ): Promise<CardSearchResultDto[]> {
    const query = set
      ? `name:"${name}" set.name:"${set}"`
      : `name:"${name}"`;

    return this.searchCards(query, limit);
  }

  private mapToSearchResult(card: IPokemonTCGCard): CardSearchResultDto {
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

  private mapToMetadata(card: IPokemonTCGCard): CardMetadataDto {
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
