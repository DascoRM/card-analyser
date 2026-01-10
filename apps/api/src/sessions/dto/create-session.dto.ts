import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ description: "ID de l'utilisateur" })
  @IsInt()
  userId: number;

  @ApiPropertyOptional({ description: 'Nom de la carte' })
  @IsOptional()
  @IsString()
  cardName?: string;

  @ApiPropertyOptional({ description: 'Set de la carte' })
  @IsOptional()
  @IsString()
  cardSet?: string;

  @ApiPropertyOptional({
    description: 'Année de la carte',
    minimum: 1900,
    maximum: 2100,
  })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  cardYear?: number;

  @ApiPropertyOptional({
    description: 'Type de carte (Pokemon, Sports, etc.)',
  })
  @IsOptional()
  @IsString()
  cardType?: string;
}
