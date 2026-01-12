import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, Max, MaxLength } from 'class-validator';

export class CreateFeedbackDto {
  @ApiProperty({ description: 'Centering score correction (1-10)', minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  centering: number;

  @ApiProperty({ description: 'Corners score correction (1-10)', minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  corners: number;

  @ApiProperty({ description: 'Edges score correction (1-10)', minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  edges: number;

  @ApiProperty({ description: 'Surface score correction (1-10)', minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  surface: number;

  @ApiProperty({ description: 'Print quality score correction (1-10)', minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  printQuality: number;

  @ApiPropertyOptional({ description: 'Optional comment about the correction', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
