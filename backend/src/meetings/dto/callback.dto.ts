import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MeetingStatus } from '../entities/meeting.entity';

class TimelineEntryDto {
  @IsString()
  @IsNotEmpty()
  speaker: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsOptional()
  timestamp?: string;

  @IsOptional()
  start?: number;

  @IsOptional()
  end?: number;
}

export class MeetingCallbackDto {
  @IsOptional()
  @IsEnum(MeetingStatus)
  status?: MeetingStatus;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsOptional()
  @IsArray()
  summaryPhases?: Array<{ title: string; points: string[] }>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimelineEntryDto)
  formattedLines?: TimelineEntryDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimelineEntryDto)
  raw_transcript?: TimelineEntryDto[];

  @IsObject()
  @IsOptional()
  apiPayload?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  extra?: Record<string, unknown>;
}
