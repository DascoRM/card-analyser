import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GradeScale } from '../enums';

export class AnalyzeSessionDto {
  @ApiProperty({
    enum: GradeScale,
    description: 'Échelle de notation (PCA ou PSA)',
  })
  @IsEnum(GradeScale)
  scale: GradeScale;
}
