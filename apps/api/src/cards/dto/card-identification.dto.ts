import { ApiProperty } from '@nestjs/swagger';

export class CardIdentificationDto {
  @ApiProperty({ description: 'Nom de la carte' })
  cardName: string;

  @ApiProperty({ description: 'Set de la carte', required: false })
  cardSet?: string;

  @ApiProperty({ description: 'Année de sortie', required: false })
  cardYear?: number;

  @ApiProperty({ description: 'Numéro de la carte', required: false })
  cardNumber?: string;

  @ApiProperty({ description: 'Type de carte', required: false })
  cardType?: string;

  @ApiProperty({ description: 'Rareté', required: false })
  cardRarity?: string;

  @ApiProperty({ description: 'Artiste', required: false })
  cardArtist?: string;

  @ApiProperty({ description: 'URL image de référence', required: false })
  cardImageUrl?: string;

  @ApiProperty({ description: 'Score de confiance 0-1' })
  confidence: number;

  @ApiProperty({ enum: ['ocr', 'manual', 'api'], description: 'Méthode utilisée' })
  method: string;

  @ApiProperty({ description: 'Texte extrait par OCR', required: false })
  extractedText?: string[];

  @ApiProperty({ description: 'ID PokémonTCG API', required: false })
  apiId?: string;
}

export class MatchCardDto {
  @ApiProperty({ description: 'Texte extrait par OCR' })
  extractedText: string[];

  @ApiProperty({ description: 'Nom de la carte (optionnel)', required: false })
  cardName?: string;

  @ApiProperty({ description: 'Set de la carte (optionnel)', required: false })
  cardSet?: string;
}
