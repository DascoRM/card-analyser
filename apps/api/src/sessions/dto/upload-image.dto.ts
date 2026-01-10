import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CardSide } from '../enums';

export class UploadImageDto {
  @ApiProperty({
    enum: CardSide,
    description: 'Face de la carte (FRONT ou BACK)',
  })
  @IsEnum(CardSide)
  @IsNotEmpty()
  side: CardSide;
}
