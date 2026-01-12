import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus, GradeScale, CardSide } from '../enums';

export class SessionImageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: CardSide })
  side: CardSide;

  @ApiProperty()
  url: string;

  @ApiProperty()
  filename: string;

  @ApiProperty()
  uploadedAt: Date;
}

export class GradeResultResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: GradeScale })
  scale: GradeScale;

  @ApiProperty()
  centering: number;

  @ApiProperty()
  corners: number;

  @ApiProperty()
  edges: number;

  @ApiProperty()
  surface: number;

  @ApiProperty()
  printQuality: number;

  @ApiProperty()
  finalGrade: number;

  @ApiProperty()
  gradeLabel: string;

  @ApiPropertyOptional()
  confidence?: number;

  @ApiPropertyOptional()
  modelVersion?: string;

  @ApiPropertyOptional()
  method?: string;

  @ApiProperty()
  createdAt: Date;
}

export class SessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: number;

  @ApiPropertyOptional()
  cardName?: string;

  @ApiPropertyOptional()
  cardSet?: string;

  @ApiPropertyOptional()
  cardYear?: number;

  @ApiPropertyOptional()
  cardType?: string;

  @ApiProperty({ enum: SessionStatus })
  status: SessionStatus;

  @ApiProperty({ type: [SessionImageResponseDto] })
  images: SessionImageResponseDto[];

  @ApiProperty({ type: [GradeResultResponseDto] })
  gradeResults: GradeResultResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date;
}
