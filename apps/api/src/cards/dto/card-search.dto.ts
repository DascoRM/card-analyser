import { ApiProperty } from '@nestjs/swagger';

export class CardSearchResultDto {
  @ApiProperty({ description: 'ID de la carte (PokémonTCG API)' })
  id: string;

  @ApiProperty({ description: 'Nom de la carte' })
  name: string;

  @ApiProperty({ description: 'Nom du set' })
  set: string;

  @ApiProperty({ description: 'Numéro de la carte', required: false })
  number?: string;

  @ApiProperty({ description: 'Rareté', required: false })
  rarity?: string;

  @ApiProperty({ description: 'URL de l\'image', required: false })
  imageUrl?: string;

  @ApiProperty({ description: 'Date de sortie', required: false })
  releaseDate?: string;
}

export class CardMetadataDto extends CardSearchResultDto {
  @ApiProperty({ description: 'Artiste', required: false })
  artist?: string;

  @ApiProperty({ description: 'Points de vie', required: false })
  hp?: string;

  @ApiProperty({ description: 'Types de la carte', required: false })
  types?: string[];

  @ApiProperty({ description: 'Super-type (Pokémon, Trainer, Energy)', required: false })
  supertype?: string;

  @ApiProperty({ description: 'Sous-types', required: false })
  subtypes?: string[];
}
