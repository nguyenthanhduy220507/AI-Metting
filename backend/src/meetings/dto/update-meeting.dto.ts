import { IsOptional, IsObject } from 'class-validator';

export class UpdateMeetingDto {
  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}

