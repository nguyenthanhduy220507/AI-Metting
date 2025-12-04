import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateSpeakerDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

