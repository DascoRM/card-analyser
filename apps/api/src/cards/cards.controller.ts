import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  DefaultValuePipe,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CardsService } from './cards.service';
import {
  CardSearchResultDto,
  CardMetadataDto,
  MatchCardDto,
} from './dto';

@Controller('cards')
@ApiTags('Cards')
export class CardsController {
  private readonly logger = new Logger(CardsController.name);

  constructor(private readonly cardsService: CardsService) {}

  /**
   * Search cards by query string
   * Used for auto-completion in the frontend
   */
  @Get('search')
  @ApiOperation({ summary: 'Search Pokémon cards by name' })
  @ApiQuery({
    name: 'query',
    description: 'Search query',
    example: 'Charizard',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max results',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'List of matching cards',
    type: [CardSearchResultDto],
  })
  async searchCards(
    @Query('query') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<CardSearchResultDto[]> {
    this.logger.log(`Search request: query=${query}, limit=${limit}`);
    return this.cardsService.searchCards(query, limit);
  }

  /**
   * Get card details by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get card details by PokémonTCG API ID' })
  @ApiResponse({
    status: 200,
    description: 'Card details',
    type: CardMetadataDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Card not found',
  })
  async getCard(@Param('id') id: string): Promise<CardMetadataDto> {
    this.logger.log(`Get card request: id=${id}`);
    return this.cardsService.getCardById(id);
  }

  /**
   * Match a card from OCR extracted text
   */
  @Post('match')
  @ApiOperation({ summary: 'Match a card from OCR extracted text' })
  @ApiResponse({
    status: 200,
    description: 'Matched card metadata',
    type: CardMetadataDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Unable to match card',
  })
  async matchCard(@Body() matchCardDto: MatchCardDto): Promise<CardMetadataDto | null> {
    this.logger.log(`Match card request: ${JSON.stringify(matchCardDto)}`);
    return this.cardsService.matchCard(matchCardDto);
  }
}
