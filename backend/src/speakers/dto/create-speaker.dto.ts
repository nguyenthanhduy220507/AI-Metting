import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSpeakerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}

