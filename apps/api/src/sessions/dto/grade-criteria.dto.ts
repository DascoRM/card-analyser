import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GradeCriteriaDto {
  @ApiProperty({
    description: 'Score centrage (1-10)',
    minimum: 1,
    maximum: 10,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  centering: number;

  @ApiProperty({
    description: 'Score coins (1-10)',
    minimum: 1,
    maximum: 10,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  corners: number;

  @ApiProperty({
    description: 'Score arêtes (1-10)',
    minimum: 1,
    maximum: 10,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  edges: number;

  @ApiProperty({
    description: 'Score surface (1-10)',
    minimum: 1,
    maximum: 10,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  surface: number;

  @ApiProperty({
    description: 'Score qualité impression (1-10)',
    minimum: 1,
    maximum: 10,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  printQuality: number;
}
