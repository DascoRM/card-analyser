import { PartialType, OmitType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateSessionDto } from './create-session.dto';
import { SessionStatus } from '../enums';

export class UpdateSessionDto extends PartialType(
  OmitType(CreateSessionDto, ['userId'] as const),
) {
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;
}
